export declare type vec = number[];
export declare type vec2 = [number, number];
export declare type vec3 = [number, number, number];
export declare type vec4 = [number, number, number, number];

export function add<T extends vec | vec2 | vec3 | vec4>(v1: T, v2: T | number): T {
    const result = [];
    if (typeof v2 === 'number') {
        const n = v1.length;
        for (let i = 0; i !== n; ++i) {
            result.push(v1[i] + v2);
        }
    } else {
        const n = Math.max(v1.length, v2.length);
        for (let i = 0; i !== n; ++i) {
            result.push((v1[i] || 0) + (v2[i] || 0))
        }
    }
    return result as T;
}

export function sub<T extends vec | vec2 | vec3 | vec4>(v1: T, v2: T | number): T {
    const result = [];
    if (typeof v2 === 'number') {
        const n = v1.length;
        for (let i = 0; i !== n; ++i) {
            result.push(v1[i] - v2);
        }
    } else {
        const n = Math.max(v1.length, v2.length);
        for (let i = 0; i !== n; ++i) {
            result.push((v1[i] || 0) - (v2[i] || 0))
        }
    }
    return result as T;
}

export function mul<T extends vec | vec2 | vec3 | vec4>(v1: T, v2: T | number): T {
    const result = [];
    if (typeof v2 === 'number') {
        const n = v1.length;
        for (let i = 0; i !== n; ++i) {
            result.push(v1[i] * v2);
        }
    } else {
        const n = Math.max(v1.length, v2.length);
        for (let i = 0; i !== n; ++i) {
            result.push((v1[i] || 0) * (v2[i] || 0))
        }
    }
    return result as T;
}

export function div<T extends vec | vec2 | vec3 | vec4>(v1: T, v2: T | number): T {
    const result = [];
    if (typeof v2 === 'number') {
        const n = v1.length;
        for (let i = 0; i !== n; ++i) {
            result.push(v1[i] / v2);
        }
    } else {
        const n = Math.max(v1.length, v2.length);
        for (let i = 0; i !== n; ++i) {
            result.push((v1[i] || 0) / (v2[i] || 1))
        }
    }
    return result as T;
}

export function equal<T extends vec | vec2 | vec3 | vec4>(v1: T, v2: T): boolean {
    const n = Math.max(v1.length, v2.length);
    for (let i = 0; i !== n; ++i) {
        if ((v1[i] || 0) !== (v2[i] || 0)) {
            return false;
        }
    }
    return true;
}

export function notEqual<T extends vec | vec2 | vec3 | vec4>(v1: T, v2: T): boolean {
    return !equal(v1, v2);
}

export function dot<T extends vec | vec2 | vec3 | vec4>(v1: T, v2: T): number {
    let result = 0;
    const n = Math.max(v1.length, v2.length);
    for (let i = 0; i !== n; ++i) {
        result += (v1[i] || 0) * (v2[i] || 0);
    }
    return result;
}

// export function cross(v1: vec3, v2: vec3): vec3 {
//     return [0, 0, 0];
// }

function getAngle(v: vec2): number {
    return Math.atan2(v[1], v[0]);
}
export { getAngle as angle };

function getLength<T extends vec | vec2 | vec3 | vec4>(v: T): number {
    return Math.sqrt(length2(v));
}
export { getLength as length };

export function length2<T extends vec | vec2 | vec3 | vec4>(v: T): number {
    return dot(v, v);
}

export function distance<T extends vec | vec2 | vec3 | vec4>(v1: T, v2: T): number {
    return Math.sqrt(distance2(v1, v2));
}

export function distance2<T extends vec | vec2 | vec3 | vec4>(v1: T, v2: T): number {
    let result = 0;
    const n = Math.max(v1.length, v2.length);
    for (let i = 0; i !== n; ++i) {
        const d = (v1[i] || 0) - (v2[i] || 0);
        result += d * d;
    }
    return result;
}

export function fromPolar(length: number, angle: number): vec2 {
    return [length * Math.cos(angle), length * Math.sin(angle)];
}

export function rotate(v: vec2, angle: number): vec2 {
    return fromPolar(getAngle(v) + angle, getLength(v));
}
