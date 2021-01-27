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
    spacing: vec2; // lateral, frontal
    /* placement?: {[subunitId: string]: vec2}; // right, front */
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
    size: vec3; // width, height, depth
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
    reach: number /* | [number, number] */ ;
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

export interface MissileType extends ValueStruct {
    id?: number;
    range: [number, number];
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
    trajectoryShape?: string;
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

export interface Line extends ValueStruct {
    deltas: number[];
    colors: vec4[];
}

export interface LoopType extends ValueStruct {
    friendly?: boolean;
    hostile?: boolean;
    dead?: boolean;
}

export interface Loop extends ValueStruct {
    type?: LoopType;
    texture: string;
    texgrid?: number;
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


export interface Marker extends ValueStruct {
    texture: string;
    texgrid?: number;
    layers: MarkerLayer[];
}

export enum MarkerColor {
    Alliance = 'ALLIANCE',
    Commander = 'COMMANDER'
}

export interface MarkerLayer extends ValueStruct {
    vertices: [vec2, vec2]; // u1, v1, u2, v2
    color?: MarkerColor | null;
    state: {
        allied?: boolean | null,
        command?: boolean | null,
        dragged?: boolean | null,
        friendly?: boolean | null,
        hovered?: boolean | null
        hostile?: boolean | null,
        routed?: boolean | null,
        selected?: boolean | null,
    }
}



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
    marker: Marker;
    'stats.unitClass'?: string;
    'stats.unitStats'?: Value;
    'stats.fighterCount'?: number;
    'stats.canNotRally'?: boolean;
    fighters: vec2[];
    placement: { x: number, y: number, z: number }; // ground-x, ground-y, facing
    center?: vec2;
    routed?: boolean;
    deletedByGesture: boolean;
}

export interface DeploymentUnit extends ObjectRef {
    hostingPlayerId: string;
    alliance: Alliance;
    commander: Commander;
    marker: Marker;
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

