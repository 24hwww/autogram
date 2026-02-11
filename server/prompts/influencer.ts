export const INFLUENCER_PROMPT_HEADER = `
Generate ONE single hyperrealistic photograph.

Single subject: one woman only.
No collage. No multiple images. No variations.

Close-up portrait, head and shoulders only.
Face centered, camera at eye level.
Hands NOT visible. Arms outside the frame.

Female influencer, 25 years old.
Latin features, light olive skin with warm undertones.

FIXED FACE STRUCTURE:
Oval face shape.
Medium-width face.
Balanced facial proportions.
Eyes aligned horizontally at mid-face height.
Eye distance equals one eye width.
Medium forehead height.
Soft narrow jawline.
Soft rounded chin.
Straight natural hairline.
Do NOT change face shape or proportions.

HAIR (LOCKED):
Long straight dark brown hair.
Center part.
Hair length below shoulders.
Hair frames both sides of the face.
Consistent volume and thickness.
No hairstyle variation.

REALISTIC HUMAN SKIN:
Visible pores.
Natural skin texture.
Subtle freckles.
Slight redness on cheeks and nose.
Natural oil shine.
Realistic makeup.
Not airbrushed. Not plastic.

Photography style:
Professional DSLR photo.
85mm lens look.
Natural soft daylight.
Shallow depth of field.
Photorealistic, ultra-detailed.

IMPORTANT:
One image only.
One face only.
No hands.
No fingers.
No CGI.
No illustration.
No doll-like skin.
`;

export function buildInfluencerPrompt(userPrompt: string): string {
    return `${INFLUENCER_PROMPT_HEADER}\n\nSCENE/ACTION: ${userPrompt}`;
}
