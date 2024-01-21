const rebotoColor = (isDark: boolean, roleType: string, role: string) => {

    if (roleType === "system") {
        if (role == "CODECOACH") {
            return isDark ? "blue.300" : "blue.600"
        } else if (role == "AWSCLICOACH") {
            return isDark ? "orange.300" : "orange.600"
        } else if (role == "AUTOGEN") {
            return isDark ? "red.300" : "red.600"
        } else if (role == "NORMAL") {
            return isDark ? "green.300" : "green.600"
        }
    }
    return isDark ? "yellow.300" : "yellow.600"
}


export { rebotoColor }