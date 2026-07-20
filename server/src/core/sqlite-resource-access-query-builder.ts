export class SqliteResourceAccessQueryBuilder {
  public buildAccessibleResourcesCte(): string {
    return `
      matching_resource_access_conditions AS (
        SELECT
          c.resource_id,
          c.group_id,
          COUNT(*) AS matched_count
        FROM resource_access_rule_conditions c
        JOIN user_attributes ua
          ON ua.user_name = ?
         AND ua.attribute_name = c.attribute_name
         AND ua.attribute_type = c.attribute_type
        WHERE
          (
            c.operator = 1
            AND ua.value_string IS c.value_string
            AND ua.value_integer IS c.value_integer
            AND ua.value_boolean IS c.value_boolean
          )
          OR
          (
            c.operator = 2
            AND (
              ua.value_string IS NOT c.value_string
              OR ua.value_integer IS NOT c.value_integer
              OR ua.value_boolean IS NOT c.value_boolean
            )
          )
          OR (c.operator = 3 AND ua.value_integer > c.value_integer)
          OR (c.operator = 4 AND ua.value_integer >= c.value_integer)
          OR (c.operator = 5 AND ua.value_integer < c.value_integer)
          OR (c.operator = 6 AND ua.value_integer <= c.value_integer)
        GROUP BY c.resource_id, c.group_id
      ),

      accessible_resources AS (
        SELECT DISTINCT g.resource_id
        FROM resource_access_rule_groups g
        JOIN matching_resource_access_conditions mc
          ON mc.resource_id = g.resource_id
         AND mc.group_id = g.group_id
         AND mc.matched_count = g.condition_count
      )
    `;
  }
}
