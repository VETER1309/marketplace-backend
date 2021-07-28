using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Numerics;
using System.Reflection;
using Marketplace.Backend.Base58;
using Marketplace.Db.Models;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Backend.Offers
{
    public static class OffersFilterExtensions
    {
        public static IQueryable<Offer> FilterByCollectionIds(this IQueryable<Offer> offers, IReadOnlyCollection<ulong>? collectionIds)
        {
            if (collectionIds?.Any() == true)
            {
                return offers.Where(o => collectionIds.Contains(o.CollectionId));
            }

            return offers;
        }

        public static IQueryable<Offer> FilterByMaxPrice(this IQueryable<Offer> offers, BigInteger? maxPrice)
        {
            if (maxPrice == null)
            {
                return offers;
            }

            return offers.Where(o => o.Price <= maxPrice);
        }

        public static IQueryable<Offer> FilterByMinPrice(this IQueryable<Offer> offers, BigInteger? minPrice)
        {
            if (minPrice == null)
            {
                return offers;
            }

            return offers.Where(o => o.Price >= minPrice);
        }

        public static IQueryable<Offer> FilterBySeller(this IQueryable<Offer> offers, string? seller)
        {
            if (string.IsNullOrWhiteSpace(seller))
            {
                return offers;
            }

            // Ensure that seller is a proper base58 encoded address
            string base64Seller = "Invalid";
            try {
                var pk = AddressEncoding.AddressToPublicKey(seller);
                base64Seller = Convert.ToBase64String(pk);
            }
            catch (ArgumentNullException) {}
            catch (FormatException) {}
            catch (ArgumentOutOfRangeException) {}
            catch (ArgumentException) {}
            // Console.WriteLine($"Converted {seller} to base64: {base64Seller}");

            return offers.Where(o => o.Seller == base64Seller);
        }

        public static IQueryable<Offer> HasTraits(this IQueryable<Offer> offers)
        {
            return offers.Where(o => EF.Functions.JsonExists(o.Metadata, "traits"));
        }

        public static IQueryable<Offer> FilterByTraitsCount(this IQueryable<Offer> offers, List<int>? traitsCount)
        {
            if (traitsCount?.Any() != true)
            {
                return offers;
            }

            return offers.HasTraits().Where(o => traitsCount.Contains(o.Metadata.RootElement.GetProperty("traits").GetArrayLength()));
        }

        public static IQueryable<Offer> FilterByTraits(this IQueryable<Offer> offers, IReadOnlyCollection<long>? traits)
        {
            if (traits?.Any() != true)
            {
                return offers;
            }

            var param = Expression.Parameter(typeof(Offer), "o");
            var rootElementExpr = Expression.Property(Expression.Property(param, "Metadata"), "RootElement");
            var getTraitsExpr = Expression.TypeAs(
                Expression.Call(rootElementExpr, "GetProperty", Array.Empty<Type>(), Expression.Constant("traits", typeof(string))),
                typeof(object)
            );

            var jsonExistAll = typeof(NpgsqlJsonDbFunctionsExtensions).GetMethod("JsonExistAll", BindingFlags.Public | BindingFlags.Static);

            var traitsExpr = traits.Select(t => Expression.Constant(t.ToString(), typeof(string)));
            var traitsArray = Expression.NewArrayInit(typeof(string), traitsExpr);

            var body = Expression.Call(jsonExistAll, Expression.Constant(EF.Functions, typeof(DbFunctions)), getTraitsExpr, traitsArray);
            var filter = Expression.Lambda<Func<Offer, bool>>(body, param);

            //o => EF.Functions.JsonExistAll(o.Metadata.RootElement.GetProperty("traits"), traitsStr)
            return offers.HasTraits().Where(filter);
        }

        public static IQueryable<Offer> ApplyFilter(this IQueryable<Offer> offers, OffersFilter filter)
        {
            return offers
                .FilterBySeller(filter.Seller)
                .FilterByMaxPrice(filter.MaxPrice)
                .FilterByMinPrice(filter.MinPrice)
                .FilterByCollectionIds(filter.CollectionIds)
                .FilterByTraitsCount(filter.TraitsCount)
                .FilterByTraits(filter.RequiredTraits);
        }
    }
}
