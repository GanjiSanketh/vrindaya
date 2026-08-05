namespace Api.DTOs.Marketing
{
    public class ContentIdeaResponse
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string Platform { get; set; }
        public string ContentType { get; set; }
        public string SuggestedCaption { get; set; }
        public string SuggestedHashtags { get; set; }
        public string TargetAudience { get; set; }
        public int Confidence { get; set; }
    }
}