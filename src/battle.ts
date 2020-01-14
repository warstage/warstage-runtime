// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import { ObjectRef } from './object';


export interface Alliance extends ObjectRef {
    teamId?: string;
    position: number;
    defeated: boolean;
}

export interface Commander extends ObjectRef {
    playerId: string;
    alliance: ObjectRef;
}

export interface Unit extends ObjectRef {
    commander: ObjectRef;
    alliance: ObjectRef;
    stats: {
        unitClass: string;
        fighterCount: number;
    };
    fighters: vec2[];
    placement: { x: number, y: number, z: number };
    xxx_position?: any;
    xxx_routing?: boolean;
    deletedByGesture: boolean;
}

export interface DeploymentUnit extends ObjectRef {
    hostingPlayerId: string;
    alliance: Alliance;
    commander: Commander;
    position: vec2;
    path: vec2[];
    platform: number;
    weapon: number;
    reinforcement: boolean;
    deletable: boolean;
    deploymentZone: DeploymentZone;
}

export interface DeploymentZone extends ObjectRef {
    alliance: Alliance;
    position: vec2;
    radius: number;
}

export interface TeamKills extends ObjectRef {
    alliance: Alliance;
    kills: number;
}

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
