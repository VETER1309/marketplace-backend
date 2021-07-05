﻿// <auto-generated />
using System;
using Marketplace.Db;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace Marketplace.Db.Migrations
{
    [DbContext(typeof(MarketplaceDbContext))]
    partial class MarketplaceDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .UseIdentityByDefaultColumns()
                .HasAnnotation("Relational:MaxIdentifierLength", 63)
                .HasAnnotation("ProductVersion", "5.0.2");

            modelBuilder.Entity("Marketplace.Db.Models.KusamaProcessedBlock", b =>
                {
                    b.Property<decimal>("BlockNumber")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("numeric(20,0)");

                    b.Property<DateTime>("ProcessDate")
                        .HasColumnType("timestamp without time zone");

                    b.HasKey("BlockNumber");

                    b.ToTable("KusamaProcessedBlock");
                });

            modelBuilder.Entity("Marketplace.Db.Models.NftIncomingTransaction", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<long>("CollectionId")
                        .HasColumnType("bigint");

                    b.Property<string>("ErrorMessage")
                        .HasColumnType("text");

                    b.Property<DateTime?>("LockTime")
                        .IsConcurrencyToken()
                        .HasColumnType("timestamp without time zone");

                    b.Property<Guid?>("OfferId")
                        .HasColumnType("uuid");

                    b.Property<string>("OwnerPublicKey")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<int>("Status")
                        .HasColumnType("integer");

                    b.Property<long>("TokenId")
                        .HasColumnType("bigint");

                    b.Property<decimal>("UniqueProcessedBlockId")
                        .HasColumnType("numeric(20,0)");

                    b.Property<string>("Value")
                        .IsRequired()
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.HasIndex("OfferId");

                    b.HasIndex("UniqueProcessedBlockId");

                    b.HasIndex("Status", "LockTime")
                        .HasFilter("\"Status\" = 0");

                    b.ToTable("NftIncomingTransaction");
                });

            modelBuilder.Entity("Marketplace.Db.Models.NftOutgoingTransaction", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<decimal>("CollectionId")
                        .HasColumnType("numeric(20,0)");

                    b.Property<string>("ErrorMessage")
                        .HasColumnType("text");

                    b.Property<DateTime?>("LockTime")
                        .IsConcurrencyToken()
                        .HasColumnType("timestamp without time zone");

                    b.Property<string>("RecipientPublicKey")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<int>("Status")
                        .HasColumnType("integer");

                    b.Property<decimal>("TokenId")
                        .HasColumnType("numeric(20,0)");

                    b.Property<string>("Value")
                        .IsRequired()
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.HasIndex("Status", "LockTime")
                        .HasFilter("\"Status\" = 0");

                    b.ToTable("NftOutgoingTransaction");
                });

            modelBuilder.Entity("Marketplace.Db.Models.Offer", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<decimal>("CollectionId")
                        .HasColumnType("numeric(20,0)");

                    b.Property<DateTime>("CreationDate")
                        .HasColumnType("timestamp without time zone");

                    b.Property<string>("Metadata")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<int>("OfferStatus")
                        .HasColumnType("integer");

                    b.Property<string>("Price")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<decimal>("QuoteId")
                        .HasColumnType("numeric(20,0)");

                    b.Property<string>("Seller")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<byte[]>("SellerPublicKeyBytes")
                        .IsRequired()
                        .HasColumnType("bytea");

                    b.Property<decimal>("TokenId")
                        .HasColumnType("numeric(20,0)");

                    b.HasKey("Id");

                    b.HasIndex("CreationDate");

                    b.HasIndex("OfferStatus", "CollectionId", "TokenId");

                    b.ToTable("Offer");
                });

            modelBuilder.Entity("Marketplace.Db.Models.QuoteIncomingTransaction", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<string>("AccountPublicKey")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<string>("Amount")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<decimal?>("BlockId")
                        .HasColumnType("numeric(20,0)");

                    b.Property<string>("Description")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<string>("ErrorMessage")
                        .HasColumnType("text");

                    b.Property<DateTime?>("LockTime")
                        .IsConcurrencyToken()
                        .HasColumnType("timestamp without time zone");

                    b.Property<decimal>("QuoteId")
                        .HasColumnType("numeric(20,0)");

                    b.Property<int>("Status")
                        .HasColumnType("integer");

                    b.HasKey("Id");

                    b.HasIndex("AccountPublicKey");

                    b.HasIndex("Status", "LockTime")
                        .HasFilter("\"Status\" = 0");

                    b.ToTable("QuoteIncomingTransaction");
                });

            modelBuilder.Entity("Marketplace.Db.Models.QuoteOutgoingTransaction", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<string>("ErrorMessage")
                        .HasColumnType("text");

                    b.Property<decimal>("QuoteId")
                        .HasColumnType("numeric(20,0)");

                    b.Property<string>("RecipientPublicKey")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<int>("Status")
                        .HasColumnType("integer");

                    b.Property<string>("Value")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<int>("WithdrawType")
                        .HasColumnType("integer");

                    b.HasKey("Id");

                    b.HasIndex("Status")
                        .HasFilter("\"Status\" = 0");

                    b.ToTable("QuoteOutgoingTransaction");
                });

            modelBuilder.Entity("Marketplace.Db.Models.Trade", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid");

                    b.Property<string>("Buyer")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<Guid>("OfferId")
                        .HasColumnType("uuid");

                    b.Property<DateTime>("TradeDate")
                        .HasColumnType("timestamp without time zone");

                    b.HasKey("Id");

                    b.HasIndex("OfferId");

                    b.ToTable("Trade");
                });

            modelBuilder.Entity("Marketplace.Db.Models.UniqueProcessedBlock", b =>
                {
                    b.Property<decimal>("BlockNumber")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("numeric(20,0)");

                    b.Property<DateTime>("ProcessDate")
                        .HasColumnType("timestamp without time zone");

                    b.HasKey("BlockNumber");

                    b.ToTable("UniqueProcessedBlock");
                });

            modelBuilder.Entity("Marketplace.Db.Models.NftIncomingTransaction", b =>
                {
                    b.HasOne("Marketplace.Db.Models.Offer", "Offer")
                        .WithMany()
                        .HasForeignKey("OfferId");

                    b.HasOne("Marketplace.Db.Models.UniqueProcessedBlock", "UniqueProcessedBlock")
                        .WithMany()
                        .HasForeignKey("UniqueProcessedBlockId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Offer");

                    b.Navigation("UniqueProcessedBlock");
                });

            modelBuilder.Entity("Marketplace.Db.Models.Trade", b =>
                {
                    b.HasOne("Marketplace.Db.Models.Offer", "Offer")
                        .WithMany("Trades")
                        .HasForeignKey("OfferId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Offer");
                });

            modelBuilder.Entity("Marketplace.Db.Models.Offer", b =>
                {
                    b.Navigation("Trades");
                });
#pragma warning restore 612, 618
        }
    }
}
