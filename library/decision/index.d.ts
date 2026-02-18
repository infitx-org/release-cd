/**
 * Configuration for the decision engine
 */
export interface DecisionConfig {
    /**
     * Rules configuration - can be an array or object with rule names as keys
     */
    rules?: Rule[] | Record<string, RuleDefinition>;

    /**
     * Additional configuration properties
     */
    [key: string]: any;
}

/**
 * Rule definition structure
 */
export interface RuleDefinition {
    /**
     * Optional priority for rule evaluation (higher priority evaluated first)
     */
    priority?: number | string;

    /**
     * Condition pattern that the fact must match
     */
    when: any;

    /**
     * Result to return when condition matches (can be object or function)
     */
    then: Record<string, any> | ((fact: any) => Record<string, any>);
}

/**
 * Normalized rule structure used internally
 */
export interface Rule extends RuleDefinition {
    /**
     * Rule identifier
     */
    rule: string | number;
}

/**
 * Decision result structure
 */
export interface Decision {
    /**
     * Name/identifier of the rule that matched
     */
    rule: string | number;

    /**
     * Decision key from the 'then' clause
     */
    decision: string;

    /**
     * Additional properties from the 'then' clause value
     */
    [key: string]: any;
}

/**
 * Decision engine instance
 */
export interface DecisionEngine extends DecisionConfig {
    /**
     * Normalized array of rules
     */
    rules: Rule[];

    /**
     * Evaluate a fact against configured rules
     *
     * @param fact - The fact object to evaluate
     * @param all - If true, returns all matching rules; if false, returns first match
     * @returns Array of decisions (empty array if no matches when all=true, null if no match when all=false)
     *
     * @example
     * ```typescript
     * const engine = decision('./rules.yaml');
     * const result = engine.decide({ type: 'transfer', amount: 500 });
     * // Returns: [{ rule: 'approve-small', decision: 'approved', ...}]
     * ```
     */
    decide(fact: any, all?: boolean): Decision[] | null;
}

/**
 * Create a decision engine from a configuration file or object
 *
 * @param config - Path to YAML config file or configuration object
 * @returns Decision engine instance with rules and decide function
 *
 * @example
 * ```typescript
 * // From file
 * const engine = decision('./rules.yaml');
 *
 * // From object
 * const engine = decision({
 *   rules: {
 *     'approve-small': {
 *       when: { amount: { max: 1000 } },
 *       then: { approved: true }
 *     }
 *   }
 * });
 *
 * const result = engine.decide({ amount: 500 });
 * ```
 */
export default function decision(config: string | DecisionConfig): DecisionEngine;
