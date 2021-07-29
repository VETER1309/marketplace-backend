using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;

namespace Marketplace.Backend.Sorting
{
    public static class SortingExtension
    {
        public static IQueryable<T> Order<T>(this IQueryable<T> queryable, IReadOnlyCollection<SortingParameter>? sorting, Dictionary<string, Expression<Func<T, object>>> columnMappings)
        {
            if (sorting?.Any() != true)
            {
                return queryable;
            }

            IOrderedQueryable<T>? ordered = null;
            foreach (var sortingParameter in sorting)
            {
                if (!columnMappings.TryGetValue(sortingParameter.Column, out var expression))
                {
                    continue;
                }

                if (ordered == null)
                {
                    ordered = sortingParameter.Order == SortingOrder.Asc
                        ? queryable.OrderBy(expression)
                        : queryable.OrderByDescending(expression);
                }
                else
                {
                    ordered = sortingParameter.Order == SortingOrder.Asc
                        ? ordered.ThenBy(expression)
                        : ordered.ThenByDescending(expression);
                }
            }

            return ordered ?? queryable;
        }
    }
}
