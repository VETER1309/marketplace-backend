﻿using System.Collections.Generic;
using System.Numerics;
using Marketplace.Backend.Serializing;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace Marketplace.Backend.Offers
{
    public class OffersFilter
    {
        [BindProperty(Name = "collectionId")]
        public List<ulong>? CollectionIds { get; set; }

        [BindProperty(Name = "minPrice", BinderType = typeof(BigIntegerModelBinder))]
        public BigInteger? MinPrice { get; set; }

        [BindProperty(Name = "maxPrice", BinderType = typeof(BigIntegerModelBinder))]
        public BigInteger? MaxPrice { get; set; }

        [BindProperty(Name = "seller")]
        public string? Seller { get; set; }

        [BindProperty(Name = "minTraitsCount")]
        public int? MinTraitsCount { get; set; }

        [BindProperty(Name = "maxTraitsCount")]
        public int? MaxTraitsCount { get; set; }

        [BindProperty(Name = "requiredTraits")]
        public List<long>? RequiredTraits { get; set; }
    }
}
