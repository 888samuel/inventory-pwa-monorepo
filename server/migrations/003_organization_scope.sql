ALTER TABLE branches
  ADD COLUMN organization_id integer REFERENCES organizations(id);

ALTER TABLE products
  ADD COLUMN organization_id integer REFERENCES organizations(id);

INSERT INTO organizations (name)
SELECT 'Springfield Supplies'
WHERE EXISTS (SELECT 1 FROM branches WHERE organization_id IS NULL)
   OR EXISTS (SELECT 1 FROM products WHERE organization_id IS NULL);

UPDATE branches
SET organization_id = (SELECT id FROM organizations WHERE name = 'Springfield Supplies')
WHERE organization_id IS NULL;

UPDATE products
SET organization_id = (SELECT id FROM organizations WHERE name = 'Springfield Supplies')
WHERE organization_id IS NULL;

ALTER TABLE branches
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE products
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX idx_branches_organization ON branches(organization_id);
CREATE INDEX idx_products_organization ON products(organization_id);
