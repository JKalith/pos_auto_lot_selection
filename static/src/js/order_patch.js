/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { Orderline } from "@point_of_sale/app/store/models";

/**
 * Parche sobre el comportamiento de fusión de líneas del POS.
 *
 * Objetivo:
 * ----------
 * - Cuando el producto tiene tracking por lote/serie
 * - Y el lote es EXACTAMENTE el mismo
 *
 * Entonces:
 * - NO queremos una nueva línea
 * - Queremos que se SUME la cantidad en la misma línea.
 *
 * Para todo lo demás, dejamos que Odoo se comporte como siempre.
 */
patch(Orderline.prototype, {
    /**
     * Decide si esta línea (`this`) se puede fusionar con `otherOrderline`.
     * Si devuelve:
     *  - true  → Odoo suma cantidades en la misma línea.
     *  - false → Odoo crea una nueva línea.
     */
    can_be_merged_with(otherOrderline) {
        // 1) Si el producto no es el mismo, nunca fusionamos.
        if (this.get_product().id !== otherOrderline.get_product().id) {
            return false;
        }

        const product = this.get_product();

        // 2) Si el producto NO tiene tracking por lote/serial,
        // dejamos que Odoo use su comportamiento original.
        // (Para productos sin tracking ya te funciona bien).
        if (!product.tracking || product.tracking === "none") {
            // this._super(...) llama a la versión original de Odoo.
            return this._super(otherOrderline);
        }

        // 3) Producto CON tracking (lote/serial).
        //    Revisamos los lotes asociados a cada línea.

        // Lista de nombres de lote en la línea actual.
        const thisLots = (this.pack_lot_lines || [])
            .map((lot) => lot.lot_name)
            .filter(Boolean); // quitamos vacíos/null

        // Lista de nombres de lote en la otra línea.
        const otherLots = (otherOrderline.pack_lot_lines || [])
            .map((lot) => lot.lot_name)
            .filter(Boolean);

        // 4) Caso especial que queremos permitir:
        //    - ambas líneas tienen EXACTAMENTE 1 lote
        //    - y el nombre del lote es el mismo.
        if (
            thisLots.length === 1 &&
            otherLots.length === 1 &&
            thisLots[0] === otherLots[0]
        ) {
            // ✅ Permitir fusión → Odoo sumará cantidades
            return true;
        }

        // 5) En cualquier otro caso (lotes distintos, múltiples, sin lote):
        // volvemos al comportamiento original de Odoo.
        return this._super(otherOrderline);
    },
});
