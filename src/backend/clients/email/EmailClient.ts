/*
 * Copyright (C) 2024-present Puter Technologies Inc.
 *
 * This file is part of Puter.
 *
 * Puter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { IConfig } from '../../types';
import { MixtClient } from '../types';

export type EmailValidator = (email: string) => Promise<boolean> | boolean;

// -- Clean-email rules ------------------------------------------------

type CleanRule = (parts: { local: string; domain: string }) => {
    local: string;
    domain: string;
};

const CLEAN_RULES: Record<string, CleanRule> = {
    dots_dont_matter: ({ local, domain }) => ({
        local: local.replace(/\./g, ''),
        domain,
    }),
    remove_subaddressing: ({ local, domain }) => ({
        local: local.split('+')[0],
        domain,
    }),
};

const PROVIDER_RULES: Record<string, { apply: string[]; skip: string[] }> = {
    gmail: { apply: ['dots_dont_matter'], skip: [] },
    icloud: { apply: ['dots_dont_matter'], skip: [] },
    yahoo: { apply: [], skip: ['remove_subaddressing'] },
};

const DOMAIN_TO_PROVIDER: Record<string, string> = {
    'gmail.com': 'gmail',
    'googlemail.com': 'gmail',
    'yahoo.com': 'yahoo',
    'yahoo.co.uk': 'yahoo',
    'yahoo.ca': 'yahoo',
    'yahoo.com.au': 'yahoo',
    'icloud.com': 'icloud',
    'me.com': 'icloud',
    'mac.com': 'icloud',
};

const DOMAIN_ALIASES: Record<string, string> = {
    'googlemail.com': 'gmail.com',
};

// -- EmailClient ------------------------------------------------------

/**
 * Email address helpers. Handles:
 *
 * - Canonical-form normalization for dedup (via `clean`)
 * - Policy + extensible validation (via `validate`)
 */
export class EmailClient extends MixtClient {
    private validators: EmailValidator[] = [];

    constructor(config: IConfig) {
        super(config);
    }

    // -- Public API: clean / validate ---------------------------------

    /**
     * Normalize an email to its canonical form for dedup comparisons. Applies
     * provider-specific rules (e.g. Gmail ignores dots in the local part) plus
     * generic subaddressing removal.
     */
    clean(email: string): string {
        let [local, domain] = email.split('@');
        if (!local || !domain) return email;

        if (DOMAIN_ALIASES[domain]) {
            domain = DOMAIN_ALIASES[domain];
        }

        // Default: strip subaddressing on everything unless provider skips it
        const ruleNames = new Set<string>(['remove_subaddressing']);
        const provider = DOMAIN_TO_PROVIDER[domain];
        const rules = provider ? PROVIDER_RULES[provider] : undefined;

        if (rules) {
            rules.apply.forEach((r) => ruleNames.add(r));
            rules.skip.forEach((r) => ruleNames.delete(r));
        }

        let parts = { local, domain };
        for (const name of ruleNames) {
            parts = CLEAN_RULES[name](parts);
        }

        return `${parts.local}@${parts.domain}`;
    }

    /**
     * Check whether an email is allowed to be used. Checks domain blocklist
     * plus any registered validators (services can call `addValidator()` to
     * register custom policy hooks).
     */
    async validate(email: string): Promise<boolean> {
        if (this.config.env === 'dev') return true;

        const cleaned = this.clean(email);

        const blocked = this.config.blockedEmailDomains;
        if (Array.isArray(blocked)) {
            for (const suffix of blocked) {
                if (cleaned.endsWith(suffix)) return false;
            }
        }

        for (const validator of this.validators) {
            const ok = await validator(cleaned);
            if (!ok) return false;
        }

        return true;
    }

    /**
     * Register a custom validation hook. Services can call this during their
     * startup to veto specific emails (e.g. a disposable-email service).
     */
    addValidator(fn: EmailValidator): void {
        this.validators.push(fn);
    }
}
