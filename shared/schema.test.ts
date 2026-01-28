import { insertImageSchema } from './schema';

describe('insertImageSchema', () => {
    it('should validate a valid image object', () => {
        const validImage = {
            prompt: 'A beautiful sunset',
            caption: 'Sunset at the beach',
            autoSchedule: true,
            scheduleInterval: 60,
            isCarousel: false
        };

        const result = insertImageSchema.safeParse(validImage);
        expect(result.success).toBe(true);
    });

    it('should fail validation if prompt is missing', () => {
        const invalidImage = {
            caption: 'Sunset at the beach'
        };

        const result = insertImageSchema.safeParse(invalidImage);
        expect(result.success).toBe(false);
    });
});
