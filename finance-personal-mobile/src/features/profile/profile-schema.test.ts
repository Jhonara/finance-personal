import { expect, it } from 'vitest';
import { profileSchema } from './profile-schema';
import { preferredUserName } from './profile-presentation';
it('uses only an explicit preferred or given name and never splits a historical full name', () => {
  expect(preferredUserName({ name: 'María José De la Cruz' })).toBeUndefined();
  expect(preferredUserName({ firstName: 'María José', displayName: ' Majo ' })).toBe('Majo');
  expect(preferredUserName({ firstName: 'María José', displayName: '' })).toBe('María José');
});
it('allows a display-only edit of a legacy profile and preserves compound name fields', () => {
  expect(profileSchema.parse({ firstName: '', lastName: '', displayName: ' Ana ' })).toEqual({
    firstName: '',
    lastName: '',
    displayName: 'Ana',
  });
  expect(
    profileSchema.safeParse({ firstName: 'María José', lastName: 'De la Cruz', displayName: '' }).success,
  ).toBe(true);
  expect(profileSchema.safeParse({ firstName: '', lastName: 'De la Cruz', displayName: '' }).success).toBe(
    false,
  );
  expect(
    profileSchema.safeParse({ firstName: 'x'.repeat(90), lastName: 'x'.repeat(20), displayName: '' }).success,
  ).toBe(false);
});
