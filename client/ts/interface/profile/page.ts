import $ from 'jquery';

export default class Page {
    body: JQuery<HTMLBodyElement>;
    loaded: boolean;

    constructor(element) {
        this.body = $(element);

        this.loaded = false;
    }

    show() {
        this.body.fadeIn('slow');
    }

    hide() {
        this.body.fadeOut('slow');
    }

    isVisible() {
        return this.body.css('display') === 'block';
    }

    getImageFormat(scale, name) {
        if (!name || name === 'null') return '';

        return `url("img/${scale}/item-${name}.png")`;
    }

    update() {
        // throw new Error('Method not implemented.');
    }
}
