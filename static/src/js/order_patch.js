/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { Order } from "@point_of_sale/app/store/models";

/**
 * Guardamos la referencia al método original de Odoo
 * ANTES de aplicar el patch, para poder llamarlo luego.
 */
const _superAddProduct = Order.prototype.add_product;

/**
 * Parche sobre Order.add_product:
 *
 * - Si el producto tiene tracking (lote/serial)
 * - Y las opciones traen un lote en draftPackLotLines.newPackLotLines[0].lot_name
 * - Y ya existe una línea con el mismo producto + mismo lote
 *
 * Entonces:
 *   👉 en lugar de crear una línea nueva, se incrementa la cantidad
 *      de la línea existente.
 */
patch(Order.prototype, {
    async add_product(product, options = {}) {
        // 1) Si por alguna razón no hay producto, usamos el flujo original
        if (!product) {
            return await _superAddProduct.call(this, product, options);
        }

        // Cantidad que se va a añadir (por defecto 1)
        const quantity = options.quantity || 1;

        // 2) Solo nos interesa intervenir si el producto tiene tracking
        //    (por lote o número de serie)
        if (product.tracking && product.tracking !== "none") {
            let lotName = null;

            // Buscamos el lote que viene desde getAddProductOptions
            // (tu product.js devuelve draftPackLotLines con newPackLotLines)
            if (
                options.draftPackLotLines &&
                Array.isArray(options.draftPackLotLines.newPackLotLines) &&
                options.draftPackLotLines.newPackLotLines.length === 1
            ) {
                lotName = options.draftPackLotLines.newPackLotLines[0].lot_name;
            }

            if (lotName) {
                // 3) Buscamos si ya existe una línea con:
                //    - mismo producto
                //    - mismo lote
                const existingLine = this
                    .get_orderlines()
                    .find((line) => {
                        if (!line.product || line.product.id !== product.id) {
                            return false;
                        }
                        if (!line.pack_lot_lines || !line.pack_lot_lines.length) {
                            return false;
                        }
                        // ¿Alguna de las líneas de lote de esta orderline tiene ese mismo lot_name?
                        return line.pack_lot_lines.some(
                            (pl) => pl.lot_name === lotName
                        );
                    });

                if (existingLine) {
                    // 🔁 Ya existe una línea con mismo producto + mismo lote:
                    //     → sumamos cantidad en esa MISMA línea.
                    const currentQty = existingLine.get_quantity();
                    const newQty = currentQty + quantity;

                    console.log(
                        "[pos_auto_lot_selection] Merge en misma línea:",
                        product.display_name,
                        "Lote:", lotName,
                        "Qty:", currentQty, "→", newQty
                    );

                    existingLine.set_quantity(newQty);
                    // OJO: NO llamamos al super, así evitamos crear línea nueva.
                    return existingLine;
                }
            }
        }

        // 4) Si no se cumple nuestra condición (sin tracking, sin lote,
        //    lote distinto, etc.), usamos el comportamiento original de Odoo.
        return await _superAddProduct.call(this, product, options);
    },
});
