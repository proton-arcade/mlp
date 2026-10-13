import { describe, expect, it } from 'vitest';
import {
    accountRemovalProblem,
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
    it('shows guests only the approved apps (including games)', () => {
        const guest = { username: 'g', account_type: 'guest' };
        for (const app of ['browser', 'g-talk', 'notes', 'whiteboard', 'meetings', 'music', 'video-player', 'chess', 'settings', 'shared', 'internet']) {
            expect(isAppVisibleTo(app, guest)).toBe(true);
        }
        for (const app of ['explorer', 'team-chat', 'terminal', 'dev-center', 'admin-vault', 'app-center', 'spreadsheet', 'calendar', 'mail', 'contacts', 'presentation', 'pdf-editor', 'signatures']) {
            expect(isAppVisibleTo(app, guest)).toBe(false);
        }
        expect(isAppVisibleTo('explorer', { username: 's', account_type: 'standard' })).toBe(true);
        expect(isAppVisibleTo('chess', { username: 's', account_type: 'standard' })).toBe(true);
    });
});

describe('accountRemovalProblem', () => {
    it('never removes the owner', () => {
        expect(accountRemovalProblem('owner', { currentType: 'owner', isSelf: false })).not.toBeNull();
    });
    it('does not let anyone remove their own account', () => {
        expect(accountRemovalProblem('owner', { currentType: 'standard', isSelf: true })).not.toBeNull();
    });
    it('lets the owner remove others, and administrators remove non-administrators', () => {
        expect(accountRemovalProblem('owner', { currentType: 'administrator', isSelf: false })).toBeNull();
        expect(accountRemovalProblem('administrator', { currentType: 'guest', isSelf: false })).toBeNull();
        expect(accountRemovalProblem('administrator', { currentType: 'administrator', isSelf: false })).not.toBeNull();
    });
    it('stops developers and standard users', () => {
        expect(accountRemovalProblem('developer', { currentType: 'guest', isSelf: false })).not.toBeNull();
    });
});
