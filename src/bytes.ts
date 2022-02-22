export const evenHexString = (v: string) => (v.length % 2 == 0 ? v : `0${v}`);
export const removeHexPrefix = (v: string) => v.replace(/^0x/gi, '');

export class BytesBuffer {
  private buf: string[] = [];

  get length(): number {
    return this.buf.join('').length / 2;
  }

  private write(val: number | string, bitLength: number = 256): this {
    const hexLen = bitLength / 4;
    if (typeof val === 'number') {
      this.buf.push(val.toString(16).padStart(hexLen, '0'));
    } else {
      this.buf.push(removeHexPrefix(val).padStart(hexLen, '0'));
    }
    return this;
  }

  public static from(bytes: string): BytesBuffer {
    return new BytesBuffer().writeBytes(bytes);
  }

  public writeBytes(val: string): this {
    this.buf.push(evenHexString(removeHexPrefix(val)));
    return this;
  }

  public writeAddress(val: string): this {
    this.write(val, 160);
    return this;
  }

  public writeUint256(val: string): this {
    this.write(val);
    return this;
  }

  public writeUint16(val: number): this {
    this.write(val, 16);
    return this;
  }

  public clear(): this {
    this.buf = [];
    return this;
  }

  public invoke(): string {
    return `0x${this.buf.map((e) => evenHexString(e)).join('')}`;
  }
}
