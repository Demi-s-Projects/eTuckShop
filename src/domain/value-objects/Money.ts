export class Money {
  private readonly centsValue: number;

  private constructor(cents: number) {
    if (!Number.isFinite(cents)) {
      throw new Error("Invalid money amount");
    }
    this.centsValue = Math.round(cents);
  }

  static fromCents(cents: number): Money {
    return new Money(cents);
  }

  static fromDollars(amount: number): Money {
    return new Money(amount * 100);
  }

  get cents(): number {
    return this.centsValue;
  }

  get dollars(): number {
    return this.centsValue / 100;
  }

  add(other: Money): Money {
    return new Money(this.centsValue + other.centsValue);
  }

  subtract(other: Money): Money {
    return new Money(this.centsValue - other.centsValue);
  }

  multiply(multiplier: number): Money {
    return new Money(this.centsValue * multiplier);
  }

  toString(): string {
    return `$${this.dollars.toFixed(2)}`;
  }
}
