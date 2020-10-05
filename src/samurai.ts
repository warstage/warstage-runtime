// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {ValueStruct} from './object';
import {vec2} from './battle';

export enum SamuraiPlatform {
    Cavalry = 0, // CAV
    General = 1, // GEN
    Ashigaru = 2, // ASH
    Samurai = 3 // SAM
}

export enum SamuraiWeapon {
    Yari = 0, // YARI
    Katana = 1, // KATA
    Naginata = 2, // NAGI
    Bow = 3, // BOW
    Arq = 4, // ARQ
    Cannon = 5 // CAN
}

export enum MissileType { None = 0, Bow = 1, Arq = 2, Cannon = 3 }
export enum PlatformType { None = 0, Infantry = 1, Cavalry = 2 }

export interface UnitStats extends ValueStruct {
    missile?: {
        missileType?: MissileType;
        minimumRange?: number; // meters
        maximumRange?: number; // meters
        flatTrajectory?: boolean;
        missileSpeed?: number; // meters / seconds
        missileDelay?: number; // seconds
        loadingTime?: number; // seconds
        hitRadius?: number; // meters
    };
    melee?: {
        weaponReach?: number; // meters
        strikingDuration?: number; // seconds
        readyingDuration?: number; // seconds
    };
    quality?: {
        trainingLevel?: number; // 0.0 - 1.0
    };
    platformType?: PlatformType;
    walkingSpeed?: number; // meters per second
    runningSpeed?: number; // meters per second
    routingSpeed?: number; // meters per second
    elementSize?: vec2; // meters
    spacing?: vec2; // meters
}

export function getSamuraiPlatform(unitClass: string): SamuraiPlatform {
    if (unitClass.startsWith('CAV-')) {
        return SamuraiPlatform.Cavalry;
    }
    if (unitClass.startsWith('GEN-')) {
        return SamuraiPlatform.General;
    }
    if (unitClass.startsWith('ASH-')) {
        return SamuraiPlatform.Ashigaru;
    }
    if (unitClass.startsWith('SAM-')) {
        return SamuraiPlatform.Samurai;
    }
    return SamuraiPlatform.Ashigaru;
}

export function getSamuraiWeapon(unitClass: string): SamuraiWeapon {
    if (unitClass.endsWith('-YARI')) {
        return SamuraiWeapon.Yari;
    }
    if (unitClass.endsWith('-KATA')) {
        return SamuraiWeapon.Katana;
    }
    if (unitClass.endsWith('-NAGI')) {
        return SamuraiWeapon.Naginata;
    }
    if (unitClass.endsWith('-BOW')) {
        return SamuraiWeapon.Bow;
    }
    if (unitClass.endsWith('-ARQ')) {
        return SamuraiWeapon.Arq;
    }
    if (unitClass.endsWith('-CAN')) {
        return SamuraiWeapon.Cannon;
    }
    return SamuraiWeapon.Yari;
}

export function getUnitClass(platform: SamuraiPlatform , weapon: SamuraiWeapon) {
    let result = '';
    switch (platform) {
        case SamuraiPlatform.Cavalry: result += 'CAV'; break;
        case SamuraiPlatform.General: result += 'GEN'; break;
        case SamuraiPlatform.Ashigaru: result += 'ASH'; break;
        case SamuraiPlatform.Samurai: result += 'SAM'; break;
    }
    switch (weapon) {
        case SamuraiWeapon.Yari: result += '-YARI'; break;
        case SamuraiWeapon.Katana: result += '-KATA'; break;
        case SamuraiWeapon.Naginata: result += '-NAGI'; break;
        case SamuraiWeapon.Bow: result += '-BOW'; break;
        case SamuraiWeapon.Arq: result += '-ARQ'; break;
        case SamuraiWeapon.Cannon: result += '-CAN'; break;
    }
    return result;
}

export function getDefaultUnitSize(platform: SamuraiPlatform , weapon: SamuraiWeapon) {
    if (weapon === SamuraiWeapon.Cannon) {
        return 12;
    }
    switch (platform) {
        case SamuraiPlatform.Cavalry:
        case SamuraiPlatform.General:
            return 40;
        case SamuraiPlatform.Ashigaru:
        case SamuraiPlatform.Samurai:
            return 80;
    }
    return 0;
}

export function getDefaultUnitStats(unitClass: string): UnitStats {
    const result: UnitStats = {
        melee: {},
        missile: {},
        quality: {}
    };

    const platform = getSamuraiPlatform(unitClass);
    const weapon = getSamuraiWeapon(unitClass);

    result.platformType = platform === SamuraiPlatform.Cavalry || platform === SamuraiPlatform.General
        ? PlatformType.Cavalry
        : PlatformType.Infantry;

    if (platform === SamuraiPlatform.Cavalry || platform === SamuraiPlatform.General) {
        result.elementSize = { x: 1.1,  y: 2.3 };
        result.spacing = { x: 1.1, y: 1.7 };
        result.walkingSpeed = 7;
        result.runningSpeed = 14;
        result.routingSpeed = 16;
    } else {
        result.elementSize = { x: 0.7, y: 0.3 };
        result.spacing = { x: 1.1, y: 0.9 };
        result.walkingSpeed = 4;
        result.runningSpeed = 8;
        result.routingSpeed = 9;
    }

    result.melee.readyingDuration = 1.0;

    switch (weapon) {
        case SamuraiWeapon.Bow:
            result.missile.missileType = MissileType.Bow;
            result.missile.minimumRange = 20;
            result.missile.maximumRange = 150;
            result.missile.missileSpeed = 75;
            result.missile.missileDelay = 0.2;
            result.missile.loadingTime = 4;
            result.missile.hitRadius = 0.45;
            result.runningSpeed += 2; // increased speed
            result.melee.strikingDuration = 3.0;
            break;

        case SamuraiWeapon.Arq:
            result.missile.missileType = MissileType.Arq;
            result.missile.minimumRange = 20;
            result.missile.maximumRange = 110;
            result.missile.flatTrajectory = true;
            result.missile.missileSpeed = 750;
            result.missile.missileDelay = 0.5;
            result.missile.loadingTime = 6;
            result.missile.hitRadius = 0.35;
            result.walkingSpeed = 5;
            result.runningSpeed = 9;
            result.melee.strikingDuration = 3.0;
            break;

        case SamuraiWeapon.Cannon:
            result.missile.missileType = MissileType.Cannon;
            result.missile.minimumRange = 50;
            result.missile.maximumRange = 500;
            result.missile.missileSpeed = 250;
            result.missile.missileDelay = 1.5;
            result.missile.loadingTime = 10;
            result.missile.hitRadius = 4.0;
            result.walkingSpeed *= 0.2;
            result.runningSpeed *= 0.2;
            result.melee.strikingDuration = 3.0;
            break;

        case SamuraiWeapon.Yari:
            result.melee.weaponReach = 5.0;
            result.melee.strikingDuration = 2.0;
            break;

        case SamuraiWeapon.Naginata:
            result.melee.weaponReach = 2.4;
            result.melee.strikingDuration = 1.9;
            break;

        case SamuraiWeapon.Katana:
            result.melee.weaponReach = 1.0;
            result.melee.strikingDuration = 1.8;
            break;
    }

    switch (platform) {
        case SamuraiPlatform.Ashigaru:
            result.quality.trainingLevel = 0.5;
            break;
        case SamuraiPlatform.General:
            result.quality.trainingLevel = 0.9;
            break;
        default:
            result.quality.trainingLevel = 0.8;
            break;
    }

    return result;
}
