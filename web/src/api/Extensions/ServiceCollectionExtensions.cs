using Api.Services.Marketing;
using Microsoft.Extensions.DependencyInjection;

namespace Api.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddMarketingServices(this IServiceCollection services)
        {
            services.AddScoped<ForecastService>();

            return services;
        }
    }
}