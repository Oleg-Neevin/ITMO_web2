package lab;

import com.fastcgi.FCGIInterface;
import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class Main {
    static final List<String> h = new ArrayList<>();
    static final Set<String> rs = Set.of("1", "1.5", "2", "2.5", "3");

    public static void main(String[] args) {
        FCGIInterface f = new FCGIInterface();
        while (f.FCGIaccept() >= 0) {
            long t = System.nanoTime();
            String q = FCGIInterface.request.params.getProperty("QUERY_STRING");
            try {
                if (q != null && !q.isEmpty()) {
                    Map<String, String> p = parse(q);
                    int x = vx(p.get("x"));
                    BigDecimal y = vy(p.get("y"));
                    BigDecimal r = vr(p.get("r"));
                    boolean b = hit(x, y.doubleValue(), r.doubleValue());
                    h.add(String.format("{\"x\":%d,\"y\":%s,\"r\":%s,\"hit\":%b,\"time\":%d}",
                            x, y.toPlainString(), r.toPlainString(), b, System.currentTimeMillis()));
                }
                long micros = (System.nanoTime() - t) / 1000;
                send("200 OK", String.format("{\"now\":%d,\"micros\":%d,\"history\":[%s]}",
                        System.currentTimeMillis(), micros, String.join(",", h)));
            } catch (IllegalArgumentException e) {
                send("400 Bad Request", "{\"error\":\"" + e.getMessage() + "\"}");
            }
        }
    }

    static void send(String status, String body) {
        System.out.print("Status: " + status + "\r\nContent-Type: application/json\r\n\r\n" + body);
        System.out.flush();
    }

    static Map<String, String> parse(String q) {
        Map<String, String> m = new HashMap<>();
        for (String s : q.split("&")) {
            int i = s.indexOf('=');
            if (i < 0) continue;
            m.put(URLDecoder.decode(s.substring(0, i), StandardCharsets.UTF_8),
                    URLDecoder.decode(s.substring(i + 1), StandardCharsets.UTF_8));
        }
        return m;
    }

    static int vx(String s) {
        if (s == null || !s.matches("-?\\d"))
            throw new IllegalArgumentException("bad x");
        return Integer.parseInt(s);
    }

    static BigDecimal vy(String s) {
        if (s == null) throw new IllegalArgumentException("bad y");
        s = s.trim().replace(',', '.');
        if (!s.matches("-?\\d+(\\.\\d{1,5})?"))
            throw new IllegalArgumentException("bad y");
        BigDecimal y = new BigDecimal(s);
        if (y.compareTo(BigDecimal.valueOf(-3)) < 0 || y.compareTo(BigDecimal.valueOf(5)) > 0)
            throw new IllegalArgumentException("y out of range");
        return y;
    }

    static BigDecimal vr(String s) {
        if (s == null || !rs.contains(s))
            throw new IllegalArgumentException("bad r");
        return new BigDecimal(s);
    }

    static boolean hit(double x, double y, double r) {
        if (x >= 0 && y >= 0) return x + 2 * y <= r;
        if (x <= 0 && y <= 0 && x * x + y * y <= r * r / 4) return true;
        if (x >= 0 && y <= 0) return x <= r && y >= -r;
        return false;
    }
}