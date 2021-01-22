﻿using System;
using System.Threading.Tasks;
using Marketplace.Db;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Configuration;

namespace Marketplace.Escrow
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var builder = new HostBuilder()
                .ConfigureAppConfiguration((hostingContext, config) =>
                {
                    var environment = Environment.GetEnvironmentVariable("ENVIRONMENT");
                    hostingContext.HostingEnvironment.EnvironmentName = environment;
                    config.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
                    config.AddEnvironmentVariables();
                    if (hostingContext.HostingEnvironment.IsDevelopment())
                    {
                        config.AddUserSecrets<Program>();
                    }
                })
                .ConfigureServices((hostContext, services) =>
                {
                    var configuration = new Configuration();
                    hostContext.Configuration.Bind(configuration);
                    services.AddOptions<Configuration>();
                    services.AddDbModule(configuration);
                    services.AddSingleton<IHostedService, DaemonService>();
                    services.AddSingleton(configuration);
                })
                .ConfigureLogging((hostingContext, logging) => {
                    logging.AddConfiguration(hostingContext.Configuration.GetSection("Logging"));
                    logging.AddConsole();
                });

            await builder.RunConsoleAsync();        
        }
    }
}