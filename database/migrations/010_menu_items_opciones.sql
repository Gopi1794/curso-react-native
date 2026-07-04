-- Agrega soporte de variantes/opciones a menu_items
-- Formato: [{ "label": "Chico", "price": 1200 }, { "label": "Grande", "price": 1600 }]
-- Si es null, el item no tiene variantes y se usa el campo precio directamente
ALTER TABLE menu_items
    ADD COLUMN IF NOT EXISTS opciones JSONB DEFAULT NULL;
