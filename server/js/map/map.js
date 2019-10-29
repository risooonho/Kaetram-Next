/* global module */

let _ = require('underscore'),
    Grids = require('./grids'),
    Regions = require('./regions'),
    Utils = require('../util/utils'),
    config = require('../../config'),
    Modules = require('../util/modules'),
    PVPAreas = require('./areas/pvpareas'),
    MusicAreas = require('./areas/musicareas'),
    ChestAreas = require('./areas/chestareas'),
    map = require('../../data/map/world_server'),
    OverlayAreas = require('./areas/overlayareas'),
    CameraAreas = require('./areas/cameraareas'),
    ClientMap = require('../../data/map/world_client');

class Map {

    constructor(world) {
        let self = this;

        self.world = world;

        self.ready = false;

        self.load();

        self.regions = new Regions(self);
        self.grids = new Grids(self);
    }

    load() {
        let self = this;

        self.width = map.width;
        self.height = map.height;
        self.collisions = map.collisions;
        self.roamingAreas = map.roamingAreas;
        self.chestAreas = map.chestAreas;
        self.chests = map.chests;
        self.staticEntities = map.staticEntities;
        self.tilesets = map.tilesets;
        self.lights = map.lights;

        self.zoneWidth = 30;
        self.zoneHeight = 15;

        self.regionWidth = Math.floor(self.width / self.zoneWidth);
        self.regionHeight = Math.floor(self.height / self.zoneHeight);

        self.areas = {};

        self.loadAreas();
        self.loadDoors();

        self.ready = true;

        self.readyInterval = setInterval(function() {
            if (!self.world.ready)
                if (self.readyCallback)
                    self.readyCallback();
            else {
                clearInterval(self.readyInterval);
                self.readyInterval = null;
            }

        }, 50);
    }

    loadAreas() {
        let self = this;

        /**
         * The structure for the new self.areas is as follows:
         *
         * self.areas = {
         *      pvpAreas = {
         *          allPvpAreas
         *      },
         *
         *      musicAreas = {
         *          allMusicAreas
         *      },
         *
         *      ...
         * }
         */

        self.areas['PVP'] = new PVPAreas();
        self.areas['Music'] = new MusicAreas();
        self.areas['Chests'] = new ChestAreas(self.world);
        self.areas['Overlays'] = new OverlayAreas();
        self.areas['Cameras'] = new CameraAreas();
    }

    loadDoors() {
        let self = this;

        self.doors = {};

        _.each(map.doors, function(door) {
            let orientation;

            switch (door.o) {
                case 'u':
                    orientation = Modules.Orientation.Up;
                    break;

                case 'd':
                    orientation = Modules.Orientation.Down;
                    break;

                case 'l':
                    orientation = Modules.Orientation.Left;
                    break;

                case 'r':
                    orientation = Modules.Orientation.Right;
                    break;
            }

            self.doors[self.gridPositionToIndex(door.x, door.y)] = {
                x: door.tx,
                y: door.ty,
                orientation: orientation,
                portal: door.p ? door.p : 0,
                level: door.l,
                achievement: door.a,
                rank: door.r
            }

        });


    }

    indexToGridPosition(tileIndex) {
        let self = this;

        tileIndex -= 1;

        let x = self.getX(tileIndex + 1, self.width),
            y = Math.floor(tileIndex / self.width);

        return {
            x: x,
            y: y
        }
    }

    gridPositionToIndex(x, y) {
        return (y * this.width) + x + 1;
    }

    getX(index, width) {
        if (index === 0)
            return 0;

        return (index % width === 0) ? width - 1 : (index % width) - 1;
    }

    getRandomPosition(area) {
        let self = this,
            pos = {},
            valid = false;

        while (!valid) {
            pos.x = area.x + Utils.randomInt(0, area.width + 1);
            pos.y = area.y + Utils.randomInt(0, area.height + 1);
            valid = self.isValidPosition(pos.x, pos.y);
        }

        return pos;
    }

    inArea(posX, posY, x, y, width, height) {
        return posX >= x && posY >= y && posX <= width + x && posY <= height + y;
    }

    inTutorialArea(entity) {
        if (entity.x === -1 || entity.y === -1)
            return true;

        return this.inArea(entity.x, entity.y, 13, 553, 7, 7) || this.inArea(entity.x, entity.y, 15, 13, 11, 12);
    }

    nearLight(light, x, y) {
        let self = this,
            diff = Math.round(light.distance / 16),
            startX = light.x - self.zoneWidth - diff,
            startY = light.y - self.zoneHeight - diff,
            endX = light.x + self.zoneWidth + diff,
            endY = light.y + self.zoneHeight + diff;

        return x > startX && y > startY && x < endX && y < endY;
    }

    isDoor(x, y) {
        return !!this.doors[this.gridPositionToIndex(x, y)];
    }

    getDoorDestination(x, y) {
        return this.doors[this.gridPositionToIndex(x, y)];
    }

    isValidPosition(x, y) {
        return isInt(x) && isInt(y) && !this.isOutOfBounds(x, y) && !this.isColliding(x, y);
    }

    isOutOfBounds(x, y) {
        return x < 0 || x >= this.width || y < 0 || y >= this.height;
    }

    isColliding(x, y) {
        let self = this;

        if (self.isOutOfBounds(x, y))
            return false;

        let tileIndex = self.gridPositionToIndex(x - 1, y);

        return self.collisions.indexOf(tileIndex) > -1;
    }

    getActualTileIndex(tileIndex) {
        let self = this,
            tileset = self.getTileset(tileIndex);

        if (!tileset)
            return;

        return tileIndex - tileset.firstGID - 1;
    }

    getTileset(tileIndex) {
        let self = this;
        /**
         * if (id > self.tilesets[idx].firstGID - 1 &&
         id < self.tilesets[idx].lastGID + 1)
         return self.tilesets[idx];
         */

        for (let id in self.tilesets)
            if (self.tilesets.hasOwnProperty(id))
                if (tileIndex > self.tilesets[id].firstGID - 1 &&
                    tileIndex < self.tilesets[id].lastGID + 1)
                    return self.tilesets[id];

        return null;
    }

    isReady(callback) {
        this.readyCallback = callback;
    }

}

module.exports = Map;