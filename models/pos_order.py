# -*- coding: utf-8 -*-
from odoo import api, models

class PosOrder(models.Model):
    _inherit = 'pos.order'

    @api.model
    def _process_order(self, order, draft, existing_order):
        """
        Usar el flujo estándar de Odoo para validar el pedido y manejar inventario/lotes.
        Evita doble descuento y efectos colaterales sobre stock.quant.
        """
        return super(PosOrder, self)._process_order(order, draft, existing_order)
