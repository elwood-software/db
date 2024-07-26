import {
  AliasedExpression,
  AliasNode,
  Expression,
  IdentifierNode,
  OperationNode,
  sql,
} from "../deps.ts";

export class JsonValue<T> implements Expression<T> {
  #value: T;

  constructor(value: T) {
    this.#value = value;
  }

  // This is a mandatory getter. You must add it and always return `undefined`.
  // The return type must always be `T | undefined`.
  get expressionType(): T | undefined {
    return undefined;
  }

  toOperationNode(): OperationNode {
    const json = JSON.stringify(this.#value);
    // Most of the time you can use the `sql` template tag to build the returned node.
    // The `sql` template tag takes care of passing the `json` string as a parameter, alongside the sql string, to the DB.
    return sql`CAST(${json} AS JSONB)`.toOperationNode();
  }

  as<A extends string>(alias: A): AliasedJsonValue<T, A> {
    return new AliasedJsonValue(this, alias);
  }
}

class AliasedJsonValue<T, A extends string> implements AliasedExpression<T, A> {
  #expression: Expression<T>;
  #alias: A;

  constructor(expression: Expression<T>, alias: A) {
    this.#expression = expression;
    this.#alias = alias;
  }

  get expression(): Expression<T> {
    return this.#expression;
  }

  get alias(): A {
    return this.#alias;
  }

  toOperationNode(): AliasNode {
    return AliasNode.create(
      this.#expression.toOperationNode(),
      IdentifierNode.create(this.#alias),
    );
  }
}
