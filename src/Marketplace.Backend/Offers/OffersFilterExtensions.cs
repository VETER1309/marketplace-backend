using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using Marketplace.Backend.Base58;
using Marketplace.Db.Models;

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

        public static IQueryable<Offer> ApplyFilter(this IQueryable<Offer> offers, OffersFilter filter)
        {
            return offers
                .FilterBySeller(filter.Seller)
                .FilterByMaxPrice(filter.MaxPrice)
                .FilterByMinPrice(filter.MinPrice)
                .FilterByCollectionIds(filter.CollectionIds);
        }
    }
}