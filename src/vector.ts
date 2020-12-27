// tslint:disable-next-line:class-name
export class vec2 {
    x: number;
    y: number;

    /*constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }*/

    static add(v1: vec2, v2: vec2): vec2 {
        return {x: v1.x + v2.x, y: v1.y + v2.y};
    }

    static sub(v1: vec2, v2: vec2): vec2 {
        return {x: v1.x - v2.x, y: v1.y - v2.y};
    }

    static mul(v: vec2, k: number): vec2 {
        return {x: v.x * k, y: v.y * k};
    }

    static distanceSquared(v1: vec2, v2: vec2) {
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        return dx * dx + dy * dy;
    }

    static distance(v1: vec2, v2: vec2) {
        return Math.sqrt(vec2.distanceSquared(v1, v2));
    }

    static normSquared(v: vec2): number {
        return v.x * v.x + v.y * v.y;
    }

    static norm(v: vec2): number {
        return Math.sqrt(vec2.normSquared(v));
    }

    static rotate(v: vec2, a: number): vec2 {
        const n = vec2.norm(v);
        a += vec2.angle(v);
        return { x: n * Math.cos(a), y: n * Math.sin(a) };
    }

    static angle(v: vec2) {
        return Math.atan2(v.y, v.x);
    }
}

// tslint:disable-next-line:class-name
export class vec3 {
    x: number;
    y: number;
    z: number;
}

// tslint:disable-next-line:class-name
export class vec4 {
    x: number;
    y: number;
    z: number;
    w: number;
}
