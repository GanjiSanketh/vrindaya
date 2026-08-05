namespace Api.DTOs.Marketing
{
    public class TrendDataResponse
    {
        public string Period { get; set; }
        public double Revenue { get; set; }
        public int Orders { get; set; }
        public int Customers { get; set; }
        public double GrowthPercentage { get; set; }
    }
}