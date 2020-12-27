// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {ObjectRef, Value, ValueStruct} from './object';
import {vec2, vec3, vec4} from './vector';

export enum FormationType {
    Column = 'COLUMN',
    Line = 'LINE',
    Skirmish = 'SKIRMISH',
    Square = 'SQUARE',
    Wedge = 'WEDGE'
}

export interface FormationBase extends ValueStruct {
    name: string;
    spacing: {
        frontal: number;
        lateral: number;
    };
    /* placement?: {[subunitId: string]: { front: number; right: number; }}; */
}

export interface ColumnFormation extends FormationBase {
    type: FormationType.Column;
    files: number;
}

export interface LineFormation extends FormationBase {
    type: FormationType.Line;
    ranks: number;
}

export interface SkirmishFormation extends FormationBase {
    type: FormationType.Skirmish;
}

export interface SquareFormation extends FormationBase {
    type: FormationType.Square;
    ranks: number;
}

export interface WedgeFormation extends FormationBase {
    type: FormationType.Wedge;
    ranks: number;
}

export type Formation = ColumnFormation
    | LineFormation
    | SkirmishFormation
    | SquareFormation
    | WedgeFormation;

/***/

export interface UnitType extends ValueStruct {
    subunits: Subunit[];
    formations: Formation[];
    training: number;
    /* leadership: number; */
    /* fanaticism: number; */
    speed: number[]
}

export interface Subunit extends ValueStruct {
    /* id: string; */
    element: ElementType;
    individuals: number;
    weapons: WeaponType[];
    /* vehicle: VehicleType[]; */
}

export interface ElementType extends ValueStruct {
    /* name: string; */
    size: vec3;
    shape: string;
    movement: MovementType;
    /* armour: ArmourType | ArmourType[]; */
}

export interface MovementType extends ValueStruct {
    propulsion: PropulsionType;
    speed: { normal: number; slow?: number; fast?: number; };
    groundPressure: number;
}

export enum PropulsionType {
    Biped = 'BIPED',
    Quadruped = 'QUADRUPED',
    Bicycle = 'BICYCLE',
    Dicycle = 'DICYCLE',
    Wheels = 'WHEELS',
    Tracks = 'TRACKS',
    HalfTrack = 'HALFTRACK'
}

export interface ArmourType extends ValueStruct {
    area: number;
    thickness: number;
    resistance: number;
    quality: number;
}

/***/

export interface WeaponType extends ValueStruct {
    id?: string;
    element?: ElementType;
    crew?: number;
    vehicle?: VehicleType;
    melee?: MeleeType;
    missiles?: MissileType[];
    shape?: string;
}

export interface MeleeType extends ValueStruct {
    reach: number /* | {
        min: number;
        max: number;
    } */ ;
    time: {
        ready: number;
        strike: number;
        /* parry: number; */
    }
    /* pressure: {
        pointed?: number;
        edged?: number;
        blunt?: number;
    }; */
}

export enum ProjectileType { None = 0, Arrow = 1, Bullet = 2, Cannonball = 3 }

export interface MissileType extends ValueStruct {
    range: {
        min: number; // meters
        max: number; // meters
    };
    indirect?: boolean;
    initialSpeed: number; // meters per second
    /* dragCoefficient: number; */
    hitRadius: number; // meters
    time: {
        aim: number; // seconds
        release: number; // seconds
        reload: number; // seconds
    };
    /* roundsPerReload: number; */
    /* roundsPerWeapon: number; */
    projectileType: ProjectileType;
    projectileShape: string;
    releaseShape?: string;
    impactShape?: string;
}

export interface VehicleType extends ValueStruct {
    element: ElementType;
    crew: number;
    weapons: WeaponType[];
    passengers: number;
    shape: string;
}

/***/

export interface Color extends ValueStruct {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface Line extends ValueStruct {
    deltas: number[];
    colors: Color[];
}

export interface LoopType extends ValueStruct {
    friendly?: boolean;
    hostile?: boolean;
    dead?: boolean;
}

export interface Loop extends ValueStruct {
    type?: LoopType;
    texture: string;
    angles?: number[];
    vertices: number[];
}

export enum SkinType {
    Billboard = 'BILLBOARD'
}

export interface Skin extends ValueStruct {
    type: SkinType;
    loops: Loop[];
}

export interface Shape {
    name: string;
    size: vec3;
    skins?: Skin[];
    lines?: Line[];
}

export interface ShapeRef extends Shape, ObjectRef {}

/***/

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
    unitType: UnitType;
    'stats.unitClass'?: string;
    'stats.unitStats'?: Value;
    'stats.fighterCount'?: number;
    'stats.canNotRally'?: boolean;
    fighters: vec2[];
    placement: { x: number, y: number, z: number };
    center?: { x: number, y: number };
    routed?: boolean;
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

