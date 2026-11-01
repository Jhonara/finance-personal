# Category hierarchy and grouped reports

## Data model and migration

`V24__category_hierarchy.sql` adds nullable `categories.parent_category_id`. It does not insert, delete, rename, or reassign categories, so existing category IDs, budgets, and transaction references remain intact. Existing categories begin as top-level categories and appear under their own group until the user organizes them.

The parent foreign key includes category ID, owner ID, and type. Categories therefore cannot point across users or between income and expense. A database trigger and service validation limit the tree to two levels, prevent self-parenting and cycles, and reject making a category with children into a subcategory. Names are unique after trimming and case folding among siblings, while the same name can be used under another parent. A subcategory can be moved or returned to the top level. Categories continue to use the existing logical deactivation flow so historical references are retained.

The migration checks for existing case- or whitespace-only duplicate names before installing the new unique indexes. If it finds any, it stops with an error instead of renaming or merging a user's data; resolve the duplicates explicitly and retry the migration.

Historical movements and budgets stay attached to their original category. Reports resolve the category's current parent when they are queried, so moving a category changes the group shown for its full history. No ledger entries or past budget records are rewritten.

## Budget rules

Budgets remain monthly and are still stored against one category. A budget on a parent is the group's overall ceiling. If child budgets also exist, they are allocations within that ceiling: totals count the parent ceiling once, never the parent plus all child limits. A child without its own budget is covered by an existing parent ceiling. When no parent ceiling exists, only children with their own limits are budgeted; direct spending on the parent and spending in children without budgets appear under `Sin presupuesto`.

The comparison response distinguishes these cases with `hasParentBudget`. The mobile screen labels a parent limit `Techo del grupo` and an aggregate of child limits `Suma de límites individuales`; it shows budgeted spending separately when some group spending is unbudgeted. Privacy mode hides both monetary values and utilization percentages. Reactivating a subcategory requires an active parent, or explicitly removing its parent relationship.

The monthly budget comparison is in COP because the existing `Budget` model has no currency field and budget limits are COP. Expense and income reports take a currency and return one currency per response. Income categories do not create budgets.

## Reports and accounting

The existing `/api/v1/reports/month` and `/api/v1/reports/expenses` contracts remain available. Additive endpoints provide grouped monthly category amounts, category/group transaction drill-down, and monthly budget comparison:

- `GET /api/v1/reports/categories?year=YYYY&month=M&currency=COP&type=EXPENSE|INCOME`
- `GET /api/v1/reports/categories/{categoryId}/transactions?year=YYYY&month=M&currency=COP&type=EXPENSE|INCOME`
- `GET /api/v1/reports/budget-vs-actual?year=YYYY&month=M`

The reports read valid ledger entries and their reversals, apply the signed ledger amounts, and exclude voided movements. Transfers, opening balances, and credit-payment operations are not selected as expenses or income. A reversal follows the original movement's category. Summaries preserve the selected currency; the API does not combine currencies. All reads are scoped to the authenticated user.

Budget comparison reports an undefined percentage as `null` for a zero limit. `Sin categoría` and `Sin presupuesto` remain visible in their respective totals instead of silently dropping those movements.

## Mobile behavior

Category administration presents top-level groups and indented subcategories. Income and expense remain separate, and movement forms keep a single category selector with parent/subcategory labels. Budget creation can select a parent ceiling or a child allocation, and its quick-create flow can create a category under a selected parent. Expense and income reports expand parent groups and link each group or child total to its transactions. The budget report shows parent ceilings, child allocations, actual spending, available/excess amounts, and unbudgeted spending.

Local PostgreSQL migration and Android emulator validation evidence is recorded in [the validation report](category-hierarchy-validation-2026-10-30.md).
