using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Numerics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Db.Models
{
    [Index(nameof(OfferStatus), nameof(CollectionId), nameof(TokenId))]
    [Index(nameof(CreationDate))]
    [Index(nameof(Metadata))]
    [Table("Offer")]
    public class Offer
    {
        [Key]
        public Guid Id { get; set; }

        public DateTime CreationDate { get; set; }

        public ulong CollectionId { get; set; }

        public ulong TokenId { get; set; }

        public BigInteger Price { get; set; }

        public ulong QuoteId { get; set; }

        [Required]
        public string Seller { get; set; } = null!;

        public byte[] SellerPublicKeyBytes
        {
            get => Convert.FromBase64String(Seller);
            set => Seller = Convert.ToBase64String(value);
        }

        public OfferStatus OfferStatus { get; set; }

        public virtual ICollection<Trade> Trades { get; set; } = null!;

        public JsonDocument? Metadata { get; set; } = null!;
    }
}
