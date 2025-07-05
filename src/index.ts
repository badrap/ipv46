// Parse an IPv4 address from `ipStr`, starting from offset `start` and
// ending at the end of the string.
//
// Return the address as a 32-bit unsigned integer on success, otherwise
// return -1 on failure.
//
// Accept only 4 octet addresses. Accept only octets without leading zeroes.
function parseIPv4(ipStr: string, start: number): number {
  const length = ipStr.length;
  if (length - start < 7 || length - start > 15) {
    return -1;
  }

  for (let i = 0, j = 0, offset = start, octet = 0, result = 0; ; offset++) {
    if (offset >= length) {
      if (i === 3 && j > 0) {
        return ((result << 8) | octet) >>> 0;
      }
      return -1;
    }

    const ch = ipStr.charCodeAt(offset);
    if (ch >= 48 && ch <= 57 && j < 3) {
      if (octet === 0 && j > 0) {
        return -1;
      }
      octet = ((octet << 3) + (octet << 1) + (ch - 48)) | 0;
      if (octet > 255) {
        return -1;
      }
      j++;
    } else if (ch === 46 && i < 3 && j > 0) {
      result = (result << 8) | octet;
      octet = 0;
      i++;
      j = 0;
    } else {
      return -1;
    }
  }
}

/**
 * A class representing an IPv4 address. Provides related utilities as static methods.
 */
export class IPv4 {
  /**
   * Parse a string as an IPv4 address.
   *
   * @param string The input to parse as an IPv4 address.
   * @returns An IPv4 instance if parsing succeeds, otherwise null.
   * @example
   * const ip = IPv4.parse("192.168.1.1");
   * // ip is an IPv4 instance
   * @example
   * const invalid = IPv4.parse("not-an-ip");
   * // invalid is null
   */
  static parse(string: string): IPv4 | null {
    const int = parseIPv4(string, 0);
    return int < 0 ? null : new IPv4(int);
  }

  /**
   * Compare two IPv4 addresses.
   *
   * @param a The first IPv4 address.
   * @param b The second IPv4 address.
   * @returns 0, -1, or 1 if `a` is equal to, less than or greater than `b`, respectively.
   * @example
   * const a = IPv4.parse("192.168.1.1");
   * const b = IPv4.parse("192.168.1.2");
   * IPv4.cmp(a, a); // 0
   * IPv4.cmp(a, b); // -1
   * IPv4.cmp(b, a); // 1
   */
  static cmp(a: IPv4, b: IPv4): number {
    return Math.sign(a._u32 - b._u32);
  }

  /**
   * The IP version number (always 4).
   */
  declare readonly version: 4;
  static {
    Object.defineProperty(this.prototype, "version", {
      value: 4,
      writable: false,
    });
  }

  /**
   * The IPv4 address as a 32-bit unsigned integer.
   *
   * @internal
   */
  private readonly _u32: number;

  private constructor(_u32: number) {
    this._u32 = _u32;
  }

  /**
   * Convert the IPv4 address to its string representation.
   *
   * @returns The IPv4 address as a string.
   * @example
   * const ip = IPv4.parse("192.168.1.1");
   * ip.toString(); // "192.168.1.1"
   */
  toString(): string {
    const b = this._u32;
    return `${b >>> 24}.${(b >>> 16) & 0xff}.${(b >>> 8) & 0xff}.${b & 0xff}`;
  }

  /**
   * Get an IP range from this IPv4 address by applying a CIDR block mask to it.
   *
   * @param bits The number of bits in the mask.
   * @returns An IPRange representing the CIDR block.
   * @example
   * const ip = IPv4.parse("192.168.1.100");
   * const range = ip.cidr(24);
   * // range covers 192.168.1.0 to 192.168.1.255
   */
  cidr(bits: number): IPRange {
    if (bits === 32) {
      return new IPRange(this, this);
    }
    const mask = -1 >>> bits;
    const first = new IPv4((this._u32 & ~mask) >>> 0);
    const last = new IPv4((this._u32 | mask) >>> 0);
    return new IPRange(first, last);
  }

  /** @internal */
  _cidrBits(last: IPv4): number {
    const a = this._u32;
    const b = last._u32;

    // Fast path: This is a single-IP range.
    if (a === b) {
      return 32;
    }

    // Find out the shortest bit prefix length that the addresses
    // *don't* share.
    let lo = 1;
    let hi = 32;
    while (lo < hi) {
      const mid = (hi + lo) >> 1;
      const mask = -1 >>> mid;
      if ((a | mask) === (b | mask)) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    // Ensure that `a` and `b` actually are the first and last address
    // in the potential CIDR block.
    const mask = (-1 >>> (lo - 1)) | 0;
    if ((a & mask) !== 0 || (b & mask) !== mask) {
      return -1;
    }

    // Return the length of the longest bit prefix that the addresses
    // *do* share.
    return lo - 1;
  }

  /** @internal */
  _next(): IPv4 | null {
    const b = (this._u32 + 1) | 0;
    return b === 0 ? null : new IPv4(b);
  }
}

const IPV6_REGEX = /^[a-f0-9:]{2,39}$/i;
const IPV6_ZEROS = [0, 0, 0, 0, 0, 0, 0, 0];

function parseHexWords(ipStr: string): number[] | null {
  if (!ipStr) {
    return [];
  }

  const split = ipStr.split(":");
  const words = [];
  for (let i = 0; i < split.length; i++) {
    const str = split[i];
    if (!str || str.length > 4) {
      return null;
    }
    words.push(parseInt(str, 16));
  }
  return words;
}

function formatHexWords(words: number[], start?: number, end?: number): string {
  return words
    .slice(start, end)
    .map((w) => w.toString(16))
    .join(":");
}

function parseIPv6Words(ipStr: string): number[] | null {
  if (!IPV6_REGEX.test(ipStr)) {
    return null;
  }

  const idx = ipStr.indexOf("::");
  if (idx >= 0 && ipStr.includes("::", idx + 1)) {
    return null;
  }

  let head: number[] | null;
  let tail: number[] | null;
  if (idx >= 0) {
    head = parseHexWords(ipStr.slice(0, idx));
    tail = parseHexWords(ipStr.slice(idx + 2));
  } else {
    head = parseHexWords(ipStr);
    tail = [];
  }
  if (!head || !tail) {
    return null;
  }

  if (idx < 0 && head.length !== 8) {
    return null;
  }
  if (idx >= 0 && head.length + tail.length > 7) {
    return null;
  }
  return head.concat(IPV6_ZEROS.slice(0, 8 - head.length - tail.length), tail);
}

function formatIPv6(words: number[]): string {
  let currentRun = 0;
  let longestRun = 0;
  let start = null;
  for (let i = 0; i < 8; i++) {
    if (words[i] === 0) {
      currentRun += 1;
      if (currentRun > 1 && currentRun > longestRun) {
        longestRun = currentRun;
        start = i - currentRun + 1;
      }
    } else {
      currentRun = 0;
    }
  }

  if (start === null) {
    return formatHexWords(words);
  }
  return (
    formatHexWords(words, 0, start) +
    "::" +
    formatHexWords(words, start + longestRun)
  );
}

/**
 * A class representing an IPv6 address. Provides related utilities as static methods.
 */
export class IPv6 {
  /**
   * Parse a string as an IPv6 address.
   *
   * @param string The input to parse as an IPv6 address.
   * @returns An IPv6 instance if parsing succeeds, otherwise null.
   * @example
   * const ip = IPv6.parse("2001:db8::1");
   * // ip is an IPv6 instance
   * @example
   * const embedded = IPv6.parse("::ffff:192.0.2.1");
   * // embedded IPv4 address in IPv6
   */
  static parse(string: string): IPv6 | null {
    const index = string.lastIndexOf(":");
    if (index < 0) {
      return null;
    }

    const ip4 = parseIPv4(string, index + 1);
    if (ip4 < 0) {
      const words = parseIPv6Words(string);
      if (words === null) {
        return null;
      }
      return new IPv6(words);
    }

    const words = parseIPv6Words(string.slice(0, index + 1) + "0:0");
    if (words === null) {
      return null;
    }
    words[6] = ip4 >>> 16;
    words[7] = ip4 & 0xffff;
    return new IPv6(words);
  }

  /**
   * Compare two IPv6 addresses.
   *
   * @param a The first IPv6 address.
   * @param b The second IPv6 address.
   * @returns 0, -1, or 1 if `a` is equal to, less than or greater than `b`, respectively.
   * @example
   * const a = IPv6.parse("2001:db8::1");
   * const b = IPv6.parse("2001:db8::2");
   * IPv6.cmp(a, a); // 0
   * IPv6.cmp(a, b); // -1
   * IPv6.cmp(b, a); // 1
   */
  static cmp(a: IPv6, b: IPv6): number {
    const aw = a._words;
    const bw = b._words;

    const len = aw.length;
    for (let i = 0; i < len; i++) {
      if (aw[i] !== bw[i]) {
        return aw[i] < bw[i] ? -1 : 1;
      }
    }
    return 0;
  }

  /**
   * The IP version number (always 6).
   */
  declare readonly version: 6;
  static {
    Object.defineProperty(this.prototype, "version", {
      value: 6,
      writable: false,
    });
  }

  /**
   * The IPv6 address as an array of 8 16-bit unsigned integers (words).
   *
   * @internal
   */
  private readonly _words: number[];

  /**
   * A cached string representation of the IPv6 address. Calculated
   * lazily on first use.
   *
   * @internal
   */
  private _string: string | null;

  private constructor(words: number[]) {
    this._words = words;
    this._string = null;
  }

  /**
   * Convert the IPv6 address to its string representation.
   *
   * @returns The IPv6 address as a string.
   * @example
   * const ip = IPv6.parse("2001:0db8:0000:0000:0000:0000:0000:0001");
   * ip.toString(); // "2001:db8::1"
   */
  toString(): string {
    this._string ??= formatIPv6(this._words).toLowerCase();
    return this._string;
  }

  /**
   * Get an IP range from this IPv6 address by applying a CIDR block mask to it.
   *
   * @param bits The number of bits in the mask.
   * @returns An IPRange representing the CIDR block.
   * @example
   * const ip = IPv6.parse("2001:db8::1");
   * const range = ip.cidr(64);
   * // range covers 2001:db8:: to 2001:db8::ffff:ffff:ffff:ffff
   */
  cidr(bits: number): IPRange {
    const first = new IPv6(mask(this._words, bits, 16, 0));
    const last = new IPv6(mask(this._words, bits, 16, 1));
    return new IPRange(first, last);
  }

  /** @internal */
  _cidrBits(last: IPv6): number {
    return cidrBits(this._words, last._words, 16);
  }

  /** @internal */
  _next(): IPv6 | null {
    const words = this._words.slice();
    for (let i = words.length - 1; i >= 0; i--) {
      const b = words[i];
      if (b === 65535 && i === 0) {
        return null;
      }
      if (b < 65535) {
        words[i]++;
        break;
      }
      words[i] = 0;
    }
    return new IPv6(words);
  }
}

/**
 * Represents an IP address, either IPv4 or IPv6.
 */
export type IP = IPv4 | IPv6;

/**
 * Utility functions for working with IPv4 and IPv6 addresses.
 */
export const IP: {
  /**
   * Parse a string as either an IPv4 or IPv6 address.
   *
   * @param string The input to parse.
   * @returns Return an IP instance if parsing succeeds, otherwise null.
   * @example
   * const ipv4 = IP.parse("192.168.1.1");
   * const ipv6 = IP.parse("2001:db8::1");
   * const invalid = IP.parse("not-an-ip"); // null
   */
  parse(string: string): IP | null;
  /**
   * Compare two IP addresses. IPv4 addresses are always considered to be
   * less than IPv6 addresses.
   *
   * @param a The first IP address.
   * @param b The second IP address.
   * @returns -1, 0, or 1 depending on the comparison result.
   * @example
   * const ipv4 = IP.parse("192.168.1.1");
   * const ipv6 = IP.parse("2001:db8::1");
   * IP.cmp(ipv4, ipv6); // -1 (IPv4 < IPv6)
   * IP.cmp(ipv4, ipv4); // 0 (equal)
   */
  cmp(a: IP, b: IP): number;
} = {
  parse(string) {
    return IPv4.parse(string) ?? IPv6.parse(string);
  },

  cmp(a, b) {
    if (a.version === 6 && b.version === 6) {
      return IPv6.cmp(a, b);
    } else if (a.version === 4 && b.version === 4) {
      return IPv4.cmp(a, b);
    } else if (a.version !== b.version) {
      return a.version < b.version ? -1 : 1;
    } else {
      throw new TypeError("type mismatch");
    }
  },
};

function cidrBits<T extends number[]>(
  array1: T,
  array2: T,
  bitsPerItem: 8 | 16,
): number {
  // Find the longest run of equal items from the start of the array.
  let commonItems = 0;
  for (let i = 0; i < array1.length; i++) {
    if (array1[i] !== array2[i]) {
      break;
    }
    commonItems++;
  }

  // Skip the rest if the arrays are completely equal.
  if (commonItems === array1.length) {
    return commonItems * bitsPerItem;
  }

  // Find the longest run of equal most significant bits from the
  // first item that is not equal between array1 and array2.
  let commonBits = 0;
  for (let i = 0; i < bitsPerItem; i++) {
    const mask = 1 << (bitsPerItem - i - 1);
    if ((array1[commonItems] & mask) !== (array2[commonItems] & mask)) {
      break;
    }
    commonBits++;
  }

  // Check that all the remaining bits are all zeroes in array1
  // and all ones in array2.
  for (let i = commonBits; i < bitsPerItem; i++) {
    const mask = 1 << (bitsPerItem - i - 1);
    if (
      (array1[commonItems] & mask) !== 0 ||
      (array2[commonItems] & mask) === 0
    ) {
      return -1;
    }
  }
  const allOnes = bitsPerItem === 8 ? 0xff : 0xffff;
  for (let i = commonItems + 1; i < array1.length; i++) {
    if (array1[i] !== 0 || array2[i] !== allOnes) {
      return -1;
    }
  }
  return commonItems * bitsPerItem + commonBits;
}

function mask<T extends number[]>(
  array: T,
  bits: number,
  bitsPerItem: 8 | 16,
  bitValue: 0 | 1,
): T {
  const itemMask = (1 << bitsPerItem) - 1;

  const copy = array.slice();
  for (let i = 0; i < array.length; i++) {
    const leftBits = Math.min(
      Math.max(0, (i + 1) * bitsPerItem - bits),
      bitsPerItem,
    );
    copy[i] &= (itemMask << leftBits) & itemMask;
    copy[i] |= bitValue * ((1 << leftBits) - 1);
  }
  return copy as T;
}

/**
 * A class representing a continuous range of IP addresses.
 */
export class IPRange {
  /**
   * Parse a string as an IP range (CIDR, hyphenated, or single address).
   *
   * @param string The input to parse.
   * @returns An IPRange instance if parsing succeeds, otherwise null.
   * @example
   * const cidr = IPRange.parse("192.168.1.0/24");
   * const range = IPRange.parse("192.168.1.1-192.168.1.10");
   * const single = IPRange.parse("192.168.1.1");
   */
  static parse(string: string): IPRange | null {
    if (string.includes("/")) {
      const match = /^([^/]+)\/(\d+)$/.exec(string);
      if (!match) {
        return null;
      }
      const ip = IP.parse(match[1]);
      if (!ip) {
        return null;
      }
      const bits = Number(match[2]);
      if ((ip.version === 4 && bits > 32) || (ip.version === 6 && bits > 128)) {
        return null;
      }
      return ip.cidr(bits);
    } else if (string.includes("-")) {
      const pieces = string.split("-");
      if (pieces.length > 2) {
        return null;
      }
      const first = IP.parse(pieces[0]);
      const last = IP.parse(pieces[1]);
      if (first?.version === 4 && last?.version === 4) {
        return new IPRange(first, last);
      } else if (first?.version === 6 && last?.version === 6) {
        return new IPRange(first, last);
      }
      return null;
    } else {
      const ip = IP.parse(string);
      if (ip?.version === 4) {
        return new IPRange(ip, ip);
      } else if (ip?.version === 6) {
        return new IPRange(ip, ip);
      }
      return null;
    }
  }

  /**
   * The first IP address in the range.
   */
  readonly first: IP;

  /**
   * The last IP address in the range.
   */
  readonly last: IP;

  /**
   * The version of IP addresses in the range (4 or 6).
   */
  readonly version: 4 | 6;

  /**
   * Create a new IPRange from two IP addresses. The address versions must match.
   *
   * @param first The first IP address.
   * @param last The last IP address.
   */
  constructor(first: IPv4, last: IPv4);
  constructor(first: IPv6, last: IPv6);
  constructor(first: IP, last: IP) {
    if (first.version !== last.version) {
      throw new TypeError("incompatible IP versions");
    }
    if (IP.cmp(first, last) > 0) {
      this.first = last;
      this.last = first;
    } else {
      this.first = first;
      this.last = last;
    }
    this.version = first.version;
  }

  /**
   * Yield all IP addresses in the range.
   *
   * @returns An iterable of IP addresses from first to last.
   * @example
   * const range = IPRange.parse("192.168.1.1-192.168.1.3");
   * for (const ip of range.ips()) {
   *   console.log(ip.toString());
   * }
   * // Outputs: "192.168.1.1", "192.168.1.2", "192.168.1.3"
   */
  *ips(): Iterable<IP> {
    let ip: IP | null = this.first;
    while (ip && IP.cmp(ip, this.last) <= 0) {
      yield ip;
      ip = ip._next();
    }
  }

  /**
   * Convert the range to its string representation.
   *
   * @returns Return a minimal string representation of the range.
   * @example
   * const cidr = IPRange.parse("192.168.1.0/24");
   * cidr.toString(); // "192.168.1.0/24"
   * @example
   * const range = IPRange.parse("192.168.1.1-192.168.1.10");
   * range.toString(); // "192.168.1.1-192.168.1.10"
   */
  toString(): string {
    if (this.first === this.last) {
      return this.first.toString();
    }

    let bits: number;
    let maxBits: number;
    if (this.first.version === 4) {
      bits = this.first._cidrBits(this.last as IPv4);
      maxBits = 32;
    } else {
      bits = this.first._cidrBits(this.last as IPv6);
      maxBits = 128;
    }

    if (bits < 0) {
      return this.first.toString() + "-" + this.last.toString();
    } else if (bits === maxBits) {
      return this.first.toString();
    } else {
      return this.first.toString() + "/" + String(bits);
    }
  }
}
