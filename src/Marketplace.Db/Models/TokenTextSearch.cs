using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Db.Models
{
    [Index(nameof(CollectionId), nameof(TokenId), nameof(Locale))]
    [Table("TokenTextSearch")]
    public class TokenTextSearch
    {
        [Key]
        public Guid Id { get; set; }

        public ulong CollectionId { get; set; }
        public ulong TokenId { get; set; }

        public string Text { get; set; }
        public string? Locale { get; set; }
    }
}
