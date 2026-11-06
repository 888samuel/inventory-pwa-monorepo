export function shopScope(branchAlias = 'branches', membershipAlias = 'memberships') {
  return `(
    ${membershipAlias}.role = 'owner'
    OR ${membershipAlias}.manages_all
    OR EXISTS (
      SELECT 1 FROM membership_branches
      WHERE membership_branches.membership_id = ${membershipAlias}.id
        AND membership_branches.branch_id = ${branchAlias}.id
    )
  )`;
}
