import assert from "node:assert";
import { describe, it, expect } from "vitest";
import { IP, IPv4, IPv6, IPRange } from "../src/ipv46";

describe("IPv4", () => {
  describe("cmp()", () => {
    it("considers addresses equal to themselves", () => {
      const a = IPv4.parse("1.2.3.4");
      assert(a);
      expect(IPv4.cmp(a, a)).toBe(0);

      const b = IPv4.parse("1.2.3.4");
      assert(b);
      expect(IPv4.cmp(b, a)).toBe(0);
      expect(IPv4.cmp(a, b)).toBe(0);
    });

    it("is not lexical", () => {
      const a = IPv4.parse("9.0.0.0");
      const b = IPv4.parse("10.0.0.0");
      assert(a && b);
      expect(IPv4.cmp(a, b)).toBe(-1);
      expect(IPv4.cmp(b, a)).toBe(1);
    });

    it("considers 127.255.255.255 less than 128.0.0.0", () => {
      const a = IPv4.parse("127.255.255.255");
      const b = IPv4.parse("128.0.0.0");
      assert(a && b);
      expect(IPv4.cmp(a, b)).toBe(-1);
      expect(IPv4.cmp(b, a)).toBe(1);
    });
  });

  describe("parse()", () => {
    it("disallows empty strings", () => {
      expect(IPv4.parse("")).toBeNull();
    });
    it("requires numbers and .", () => {
      expect(IPv4.parse("123")).toBeNull();
      expect(IPv4.parse("x.y.z.0")).toBeNull();
    });
    it("disallows leading zeroes", () => {
      expect(IPv4.parse("01.02.03.04")).toBeNull();
      expect(IPv4.parse("001.002.003.004")).toBeNull();
    });
    it("disallows numbers larger than 255", () => {
      expect(IPv4.parse("0.0.0.256")).toBeNull();
    });
    it("disallows numbers less than 0", () => {
      expect(IPv4.parse("0.0.0.-1")).toBeNull();
    });
    it("disallows too many octets", () => {
      expect(IPv4.parse("1.2.3.4.5")).toBeNull();
    });
    it("disallows too few octets", () => {
      expect(IPv4.parse("1.2.3")).toBeNull();
    });
    it("disallows leading whitespace", () => {
      expect(IPv4.parse(" 0.0.0.0")).toBeNull();
    });
    it("disallows trailing whitespace", () => {
      expect(IPv4.parse("0.0.0.0 ")).toBeNull();
    });
    it("disallows inner whitespace after octets", () => {
      expect(IPv4.parse("0.0.0 .0")).toBeNull();
    });
    it("disallows inner whitespace before octets", () => {
      expect(IPv4.parse("0.0. 0.0")).toBeNull();
    });
  });

  describe("toString()", () => {
    it("produces the parsed value", () => {
      expect(String(IPv4.parse("127.0.0.1"))).toBe("127.0.0.1");
    });
  });
});

describe("IPv6", () => {
  describe("cmp()", () => {
    it("considers addresses equal to themselves", () => {
      const a = IPv6.parse("1:2:3:4:5:6:7:8");
      assert(a);
      expect(IPv6.cmp(a, a)).toBe(0);

      const b = IPv6.parse("1:2:3:4:5:6:7:8");
      assert(b);
      expect(IPv6.cmp(a, b)).toBe(0);
      expect(IPv6.cmp(b, a)).toBe(0);
    });

    it("is not lexical", () => {
      const a = IPv6.parse("9::");
      const b = IPv6.parse("10::");
      assert(a && b);
      expect(IPv6.cmp(a, b)).toBe(-1);
      expect(IPv6.cmp(b, a)).toBe(1);
    });

    it("is case-insensitive", () => {
      const a = IPv6.parse("A::");
      const b = IPv6.parse("a::");
      assert(a && b);
      expect(IPv6.cmp(a, b)).toBe(0);
    });
  });

  describe("parse()", () => {
    it("disallows empty strings", () => {
      expect(IPv6.parse("")).toBeNull();
    });
    it("requires :", () => {
      expect(IPv6.parse("0")).toBeNull();
    });
    it("disallows non-hexadecimal characters", () => {
      expect(IPv6.parse("x:y:z:0:1:2:3:4")).toBeNull();
    });
    it("disallows a single colon", () => {
      expect(IPv6.parse(":")).toBeNull();
    });
    it("disallows a triple colon", () => {
      expect(IPv6.parse(":::")).toBeNull();
    });
    it("disallows leading whitespace", () => {
      expect(IPv6.parse(" 1:2:3:4:5:6:7:8")).toBeNull();
    });
    it("disallows trailing whitespace", () => {
      expect(IPv6.parse("1:2:3:4:5:6:7:8 ")).toBeNull();
    });
    it("disallows inner whitespace after words", () => {
      expect(IPv6.parse("1 :2:3:4:5:6:7:8")).toBeNull();
    });
    it("disallows inner whitespace before words", () => {
      expect(IPv6.parse("1: 2:3:4:5:6:7:8")).toBeNull();
    });
    it("disallows inner whitespace between colons", () => {
      expect(IPv6.parse(": :")).toBeNull();
    });
    it("allows max. 8 words", () => {
      expect(IPv6.parse("0:1:2:3:4:5:6:7:8")).toBeNull();
    });
    it("requires 8 words when there is no ::", () => {
      expect(IPv6.parse("1:2:3:4:5:6:7")).toBeNull();
    });
    it("counts :: as at least one word", () => {
      expect(IPv6.parse("1:2:3:4::5:6:7:8")).toBeNull();
    });
    it("allows only one ::", () => {
      expect(IPv6.parse("1::4::8")).toBeNull();
    });
    it("allows leading zeroes", () => {
      const a = IPv6.parse("0000:0001:0002:0003:0004:0005:0006:0007");
      const b = IPv6.parse("0:1:2:3:4:5:6:7");
      assert(a && b);
      expect(IPv6.cmp(a, b)).toBe(0);
    });
    it("allows max. 4 characters per word", () => {
      expect(IPv6.parse("00000:1:2:3:4:5:6:7")).toBeNull();
      expect(IPv6.parse("0:00001:2:3:4:5:6:7")).toBeNull();
    });
    it("requires at least one character per word", () => {
      expect(IPv6.parse(":1:2:3:4:5:6:7")).toBeNull();
    });
    it("doesn't require :: to replace the longest run of zeroes", () => {
      const a = IPv6.parse("1:0:0:3:4:0:0:0");
      const b = IPv6.parse("1::3:4:0:0:0");
      assert(a && b);
      expect(IPv6.cmp(a, b)).toBe(0);
    });
    it("doesn't require :: to replace the leftmost run of zeroes", () => {
      const a = IPv6.parse("1:0:0:0:4:0:0:0");
      const b = IPv6.parse("1:0:0:0:4::");
      assert(a && b);
      expect(IPv6.cmp(a, b)).toBe(0);
    });
    it("allows replacing all words with ::", () => {
      const a = IPv6.parse("0:0:0:0:0:0:0:0");
      const b = IPv6.parse("::");
      assert(a && b);
      expect(IPv6.cmp(a, b)).toBe(0);
    });
    it("allows mixing zero words and and ::", () => {
      const a = IPv6.parse("0:0:0:0:0:0:0:0");
      const b = IPv6.parse("0::0");
      assert(a && b);
      expect(IPv6.cmp(a, b)).toBe(0);
    });
    it("allows replacing just one zero word with ::", () => {
      const a = IPv6.parse("1::3:4:5:6:7:8");
      const b = IPv6.parse("1:0:3:4:5:6:7:8");
      assert(a && b);
      expect(IPv6.cmp(a, b)).toBe(0);
    });
    it("accepts embedded IPv4 addresses after prefix 0:0:0:0:0:0", () => {
      const a = IPv6.parse("::192.0.2.1");
      const b = IPv6.parse("::c000:201");
      assert(a && b);
      expect(IPv6.cmp(a, b)).toBe(0);
    });
    it("accepts embedded IPv4 addresses after prefix 0:0:0:0:0:ffff", () => {
      const a = IPv6.parse("::ffff:192.0.2.1");
      const b = IPv6.parse("::ffff:c000:201");
      assert(a && b);
      expect(IPv6.cmp(a, b)).toBe(0);
    });
    it("accepts embedded IPv4 addresses after any 96-bit prefix", () => {
      const a = IPv6.parse("2001:db8::192.0.2.1");
      const b = IPv6.parse("2001:db8::c000:201");
      assert(a && b);
      expect(IPv6.cmp(a, b)).toBe(0);
    });
    it("doesn't interpret a single trailing number between 0-255 as an octet", () => {
      const a = IPv6.parse("2001:db8::1ff");
      const b = IPv6.parse("2001:db8::255");
      assert(a && b);
      expect(IPv6.cmp(a, b)).toBe(-1);
    });
    it("requires embedded IPv4 addresses to be well-formed", () => {
      expect(IPv6.parse("2001:db8::192.0.2.256")).toBeNull();
      expect(IPv6.parse("2001:db8::192.0.2.1.0")).toBeNull();
      expect(IPv6.parse("2001:db8::192.0.2")).toBeNull();
      expect(IPv6.parse("2001:db8::192.0")).toBeNull();
      expect(IPv6.parse("2001:db8::192.0.2.")).toBeNull();
      expect(IPv6.parse("2001:db8::.0.2.1")).toBeNull();
    });
    it("counts embedded IPv4 address as 2 words", () => {
      expect(IPv6.parse("1:2:3:4:5:6:7:8:192.0.2.1")).toBeNull();
      expect(IPv6.parse("1:2:3:4:5:6:7:192.0.2.1")).toBeNull();
    });
    it("disallows non-trailing IPv4 addresses", () => {
      expect(IPv6.parse("192.0.2.1::")).toBeNull();
      expect(IPv6.parse("0:192.0.2.1::")).toBeNull();
      expect(IPv6.parse("0:0:192.0.2.1::")).toBeNull();
      expect(IPv6.parse("::192.0.2.1:0:0:0")).toBeNull();
      expect(IPv6.parse("::192.0.2.1:0:0")).toBeNull();
      expect(IPv6.parse("::192.0.2.1:0")).toBeNull();
    });
  });

  describe("toString()", () => {
    it("doesn't output leading zeroes", () => {
      expect(
        String(IPv6.parse("0001:0002:0003:0004:0005:0006:0007:0008")),
      ).toBe("1:2:3:4:5:6:7:8");
    });
    it("doesn't output :: when there are no two or more consecutive zero words", () => {
      expect(String(IPv6.parse("1:2:3:0:5:6:7:8"))).toBe("1:2:3:0:5:6:7:8");
    });
    it("collapses 2-8 zeroes", () => {
      expect(String(IPv6.parse("1:2:3:0:0:6:7:8"))).toBe("1:2:3::6:7:8");
      expect(String(IPv6.parse("1:2:3:0:0:0:7:8"))).toBe("1:2:3::7:8");
      expect(String(IPv6.parse("1:2:0:0:0:0:7:8"))).toBe("1:2::7:8");
      expect(String(IPv6.parse("1:2:0:0:0:0:0:8"))).toBe("1:2::8");
      expect(String(IPv6.parse("1:0:0:0:0:0:0:8"))).toBe("1::8");
      expect(String(IPv6.parse("0:0:0:0:0:0:0:8"))).toBe("::8");
      expect(String(IPv6.parse("0:0:0:0:0:0:0:0"))).toBe("::");
    });
    it("collapses zeroes even from the beginning", () => {
      expect(String(IPv6.parse("0:0:3:4:5:6:7:8"))).toBe("::3:4:5:6:7:8");
    });
    it("collapses zeroes even from the end", () => {
      expect(String(IPv6.parse("1:2:3:4:5:6:0:0"))).toBe("1:2:3:4:5:6::");
    });
    it("collapses the longest run of zeroes", () => {
      expect(String(IPv6.parse("1:0:0:4:5:0:0:0"))).toBe("1:0:0:4:5::");
    });
    it("collapses the leftmost longest run of zeroes", () => {
      expect(String(IPv6.parse("1:0:0:0:5:0:0:0"))).toBe("1::5:0:0:0");
    });
    it("always outputs lower-case", () => {
      expect(String(IPv6.parse("abcd:ef00::"))).toBe("abcd:ef00::");
      expect(String(IPv6.parse("ABCD:EF00::"))).toBe("abcd:ef00::");
    });
    it("doesn't output embedded IPv4 addresses", () => {
      expect(String(IPv6.parse("::192.0.2.1"))).toBe("::c000:201");
      expect(String(IPv6.parse("::ffff:192.0.2.1"))).toBe("::ffff:c000:201");
      expect(String(IPv6.parse("2001:db8::192.0.2.1"))).toBe(
        "2001:db8::c000:201",
      );
    });
  });
});

describe("IP", () => {
  describe("parse()", () => {
    it("disallows empty strings", () => {
      expect(IP.parse("")).toBeNull();
    });
    it("disallows values with no . or :", () => {
      expect(IP.parse("Hello, World!")).toBeNull();
    });
  });

  describe("cmp()", () => {
    it("considers all IPv4 addresses less than any IPv6 address", () => {
      const a = IP.parse("255.255.255.255");
      const b = IP.parse("::");
      assert(a && b);
      expect(IP.cmp(a, b)).toBe(-1);
      expect(IP.cmp(b, a)).toBe(1);
    });

    it("can be directly used with Array#sort", () => {
      const a = IP.parse("255.255.255.255");
      const b = IP.parse("::1");
      const c = IP.parse("255.255.255.254");
      const d = IP.parse("::");
      assert(a && b && c && d);
      const array = [a, b, c, d].sort(IP.cmp);
      expect(array).to.have.ordered.members([c, a, d, b]);
    });
  });
});

describe("IPRange", () => {
  describe("parse()", () => {
    it("disallows empty strings", () => {
      expect(IPRange.parse("")).toBeNull();
    });
    it("disallows values with no . or :", () => {
      expect(IPRange.parse("Hello, World!")).toBeNull();
    });
    it("supports single IP addresses", () => {
      const r4 = IPRange.parse("1.2.3.255");
      assert(r4);
      expect(String(r4.first)).toBe("1.2.3.255");
      expect(String(r4.last)).toBe("1.2.3.255");

      const r6 = IPRange.parse("1:2:3:ffff:5:6:7:8");
      assert(r6);
      expect(String(r6.first)).toBe("1:2:3:ffff:5:6:7:8");
      expect(String(r6.last)).toBe("1:2:3:ffff:5:6:7:8");
    });
    it("supports CIDRs", () => {
      const r4 = IPRange.parse("1.2.3.255/25");
      assert(r4);
      expect(String(r4.first)).toBe("1.2.3.128");
      expect(String(r4.last)).toBe("1.2.3.255");

      const r6 = IPRange.parse("1:2:3:ffff:5:6:7:8/49");
      assert(r6);
      expect(String(r6.first)).toBe("1:2:3:8000::");
      expect(String(r6.last)).toBe("1:2:3:ffff:ffff:ffff:ffff:ffff");
    });
    it("requires CIDR bits to be in correct ranges", () => {
      expect(IPRange.parse("::/-1")).toBeNull();
      expect(IPRange.parse("::/129")).toBeNull();
      expect(IPRange.parse("0.0.0.0/-1")).toBeNull();
      expect(IPRange.parse("0.0.0.0/33")).toBeNull();
    });
    it("supports explicit ranges", () => {
      const r4 = IPRange.parse("1.2.3.4-2.2.3.4");
      assert(r4);
      expect(String(r4.first)).toBe("1.2.3.4");
      expect(String(r4.last)).toBe("2.2.3.4");

      const r6 = IPRange.parse("1:2::-2:3::4");
      assert(r6);
      expect(String(r6.first)).toBe("1:2::");
      expect(String(r6.last)).toBe("2:3::4");
    });
    it("allows reversed ranges (reverses them implicitly)", () => {
      const r4 = IPRange.parse("2.2.3.4-1.2.3.4");
      assert(r4);
      expect(String(r4.first)).toBe("1.2.3.4");
      expect(String(r4.last)).toBe("2.2.3.4");

      const r6 = IPRange.parse("2:3::4-1:2::");
      assert(r6);
      expect(String(r6.first)).toBe("1:2::");
      expect(String(r6.last)).toBe("2:3::4");
    });
    it("requires range IPs to be of the same version", () => {
      expect(IPRange.parse("1.2.3.4-1::2")).toBeNull();
    });
  });
});
