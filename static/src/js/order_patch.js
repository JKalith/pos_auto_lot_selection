/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { Orderline } from "@point_of_sale/app/store/models";

// Guardamos el método original ANTES de parchearlo
const _superCanBeMergedWith = Orderline.prototype.can_be_merged_with;

/**
 * Parche para permitir que productos con tracking por lote/serial
 * se sumen en la misma línea cuando el lote es el mismo.
 */
patch(Orderline.prototype, {
    /**
     * otherLine = otra línea con la que Odoo intenta fusionar esta.
     */
    can_be_merged_with(otherLine) {
        // 1) Ejecutamos primero la lógica original de Odoo
        const originalResult = _superCanBeMergedWith.call(this, otherLine);

        // Si Odoo ya dice que sí se pueden fusionar, no tocamos nada.
        if (originalResult) {
            return true;
        }

        // 2) Si el producto NO tiene tracking, dejamos el resultado original.
        const product = this.get_product();
        if (!product.tracking || product.tracking === "none") {
            return originalResult;
        }

        // 3) Aquí solo entramos si el producto tiene tracking (lote/serial)

        const thisLots = (this.pack_lot_lines || [])
            .map((l) => l.lot_name)
            .filter((name) => !!name);

        const otherLots = (otherLine.pack_lot_lines || [])
            .map((l) => l.lot_name)
            .filter((name) => !!name);

        // Mismo producto + un solo lote en cada línea + mismo nombre de lote
        const sameSingleLot =
            thisLots.length === 1 &&
            otherLots.length === 1 &&
            thisLots[0] === otherLots[0];

        if (sameSingleLot) {
            // ✅ Permitimos fusionar cuando el lote es el mismo
            return true;
        }

        // En cualquier otro caso (lotes distintos, varios lotes, etc.),
        // usamos la respuesta original (normalmente false).
        return originalResult;
    },
});
