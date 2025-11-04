/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { Orderline } from "@point_of_sale/app/store/models";

/**
 * Parche sobre el comportamiento de fusión de líneas del POS
 * Permite que productos con tracking (por lote o serie)
 * se sumen en la misma línea cuando el lote es el mismo.
 */
patch(Orderline.prototype, {
    can_be_merged_with(otherOrderline) {
        // Lógica original de Odoo (copiamos lo esencial)
        if (this.get_product().id !== otherOrderline.get_product().id) {
            return false;
        }

        // Si ninguno tiene tracking, seguimos igual que siempre
        if (!this.get_product().tracking || this.get_product().tracking === 'none') {
            return true;
        }

        // Si el producto tiene tracking (serial o lote)
        // verificamos si ambos tienen el mismo lote
        const thisLots = this.pack_lot_lines.map((lot) => lot.lot_name);
        const otherLots = otherOrderline.pack_lot_lines.map((lot) => lot.lot_name);

        // Si ambos tienen exactamente el mismo lote => permitir merge
        if (thisLots.length === 1 && otherLots.length === 1 && thisLots[0] === otherLots[0]) {
            return true;
        }

        // En cualquier otro caso (lotes distintos o múltiples), no fusionar
        return false;
    },
});
