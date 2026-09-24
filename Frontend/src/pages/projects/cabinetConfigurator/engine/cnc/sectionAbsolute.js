

export function sectionAbsolute(section, ref, value) {

    switch (ref) {
        case "top" :
            return value + section.y;

        case "bottom" :
            return section.y + section.height - value;
        
        default: return;
    }

}