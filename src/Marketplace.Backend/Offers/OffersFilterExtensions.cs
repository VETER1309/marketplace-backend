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

        public static IQueryable<Offer> FilterBySearchText(this IQueryable<Offer> offers, IQueryable<TokenTextSearch> textSearches, string? searchText, string? locale)
        {
            if (string.IsNullOrWhiteSpace(searchText))
            {
                return offers;
            }

            var matchedTokens = textSearches
                .Where(t => EF.Functions.ILike(t.Text, $"%{searchText}%") && (t.Locale == locale || t.Locale == null))
                .GroupBy(t => new { t.CollectionId, t.TokenId })
                .Select(k => k.Key);
            return offers.Join(matchedTokens, offer => new {offer.CollectionId, offer.TokenId},
                match => new {match.CollectionId, match.TokenId}, (offer, match) => offer);
        }

        public static IQueryable<Offer> ApplyFilter(this IQueryable<Offer> offers, IQueryable<TokenTextSearch> textSearches, OffersFilter filter)
        {
            return offers
                .FilterBySeller(filter.Seller)
                .FilterByMaxPrice(filter.MaxPrice)
                .FilterByMinPrice(filter.MinPrice)
                .FilterByCollectionIds(filter.CollectionIds)
                .FilterByTraitsCount(filter.TraitsCount)
                .FilterBySearchText(textSearches, filter.SearchText, filter.SearchLocale);
        }
    }
}
