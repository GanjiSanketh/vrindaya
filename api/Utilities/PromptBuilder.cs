namespace Vrindaya.Api.Utilities;

public static class PromptBuilder
{
    public static string BuildMarketingPrompt(
        string product,
        string campaignGoal,
        string tone,
        string theme,
        string audience,
        string platform)
    {
        return $"""
            You are a social media marketing specialist. Generate content for the following campaign:

            Product: {product}
            Campaign Goal: {campaignGoal}
            Tone: {tone}
            Theme: {theme}
            Target Audience: {audience}
            Platform: {platform}

            Generate a caption, relevant hashtags, a hook, and a call-to-action tailored to the {platform} audience. Keep the tone {tone} and align with the {theme} theme. Focus on the {campaignGoal} goal.
            """;
    }

    public static string BuildImagePrompt(
        string product,
        string theme,
        string tone,
        string campaignGoal)
    {
        return $"""
            Generate a premium fashion catalog image for: {product}.

            Style: {tone} fashion editorial.
            Theme: {theme}.
            Goal: {campaignGoal}.

            Subject: Indian female model wearing the product, posed elegantly in a luxury studio setting.
            Lighting: Soft, diffused studio lighting with warm golden-hour accents and subtle rim light.
            Lens: 85mm f/1.4, shallow depth of field.
            Composition: Centered, clean negative space, rule of thirds.
            Camera Angle: Slight overhead angle, 30 degrees.
            Fabric Details: Show intricate fabric texture, stitching, and drape with close-up detail.
            Setting: Luxury studio with marble backdrop, soft neutral tones.
            Quality: Instagram-ready, high resolution, 4K, sharp focus, vibrant colors.

            Negative Prompt: blurry, low quality, distorted, deformed, ugly, oversaturated, noisy, grainy, watermark, text, logo, cartoon, anime, illustration, painting, 3D render, CGI, artificial, plastic, unrealistic, bad anatomy, extra limbs, disfigured, cropped, out of frame.
            """;
    }
}