import { describe, expect, it } from 'vitest';
import {
    accountTypeChangeProblem,
    canUseDevCenter,
    effectiveAccountType,
} from './accountTypes';
import { isAppVisibleTo } from './adminOnlyApps';

describe('effectiveAccountType', () => {
    it('falls back to owner for the built-in admin and standard for others', () => {
        expect(effectiveAccountType({ username: 'admin' })).toBe('owner');
        expect(effectiveAccountType({ username: 'bob' })).toBe('standard');
        expect(effectiveAccountType({ username: 'bob', account_type: 'guest' })).toBe('guest');
        expect(effectiveAccountType({ username: 'bob', account_type: 'bogus' })).toBe('standard');
    });
});

describe('accountTypeChangeProblem', () => {
    it('never changes the owner', () => {
        expect(accountTypeChangeProblem('owner', { currentType: 'owner' }, 'standard')).not.toBeNull();
    });
    it('lets the owner grant administrator', () => {
        expect(accountTypeChangeProblem('owner', { currentType: 'standard' }, 'administrator')).toBeNull();
    });
    it('stops administrators from granting or changing administrators', () => {
        expect(accountTypeChangeProblem('administrator', { currentType: 'standard' }, 'administrator')).not.toBeNull();
        expect(accountTypeChangeProblem('administrator', { currentType: 'administrator' }, 'standard')).not.toBeNull();
        expect(accountTypeChangeProblem('administrator', { currentType: 'guest' }, 'developer')).toBeNull();
    });
    it('rejects the owner type and unknown types', () => {
        expect(accountTypeChangeProblem('owner', { currentType: 'standard' }, 'owner')).not.toBeNull();
        expect(accountTypeChangeProblem('owner', { currentType: 'standard' }, 'root')).not.toBeNull();
    });
    it('denies developers and standard users', () => {
        expect(accountTypeChangeProblem('developer', { currentType: 'standard' }, 'guest')).not.toBeNull();
    });
});

describe('app visibility by account type', () => {
    it('shows Dev Center to developers and hides it from standard users', () => {
        expect(canUseDevCenter('developer')).toBe(true);
        expect(isAppVisibleTo('dev-center', { username: 'dev', account_type: 'developer' })).toBe(true);
        expect(isAppVisibleTo('dev-center', { username: 'bob', account_type: 'standard' })).toBe(false);
    });
    it('gives the admin vault only to owner and administrator', () => {
        expect(isAppVisibleTo('admin-vault', { username: 'admin' })).toBe(true);
        expect(isAppVisibleTo('admin-vault', { username: 'a', account_type: 'administrator' })).toBe(true);
        expect(isAppVisibleTo('admin-vault', { username: 'd', account_type: 'developer' })).toBe(false);
    });
    it('hides games from guests', () => {
        expect(isAppVisibleTo('chess', { username: 'g', account_type: 'guest' })).toBe(false);
        expect(isAppVisibleTo('chess', { username: 's', account_type: 'standard' })).toBe(true);
        expect(isAppVisibleTo('notes', { username: 'g', account_type: 'guest' })).toBe(true);
    });
});
