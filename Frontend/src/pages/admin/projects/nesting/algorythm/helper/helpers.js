
export function area(width, height) {

    return width * height;

}

export function clone(obj) {

    return JSON.parse(JSON.stringify(obj));

}

export function randomBool(chance = 0.5) {

    return Math.random() < chance;

}

export function canFit(rect, width, height, gap) {

    return (

        width + gap <= rect.width && height + gap <= rect.height

    );

}