// Conversion methods from EPSG Geomatics Guidance Note number 7, part 2 – September 2019

/* eslint-disable camelcase */
// EPSG 4284
const ellipsoidKrassowsky1940 = {
    a: 6378245,
    inv_f: 298.3,
};

// EPSG 4326
const ellipsoidWGS1984 = {
    a: 6378137,
    inv_f: 298.257223563,
};

// EPSG 5044
const pulkovo1942ToWgs84TransformationParams = {
    // translation in meters
    dx: 23.57,
    dy: -140.95,
    dz: -79.8,
    // rotation in arc-seconds
    rx: 0,
    ry: -0.35,
    rz: -0.79,
    // scale difference in parts per million
    ds: -0.22,
};

// Approximation according to note in EPSG 9607
// const wgs84ToPulkovo1942TransformationParams = {
//     dx: -pulkovo1942ToWgs84TransformationParams.dx,
//     dy: -pulkovo1942ToWgs84TransformationParams.dy,
//     dz: -pulkovo1942ToWgs84TransformationParams.dz,
//     rx: -pulkovo1942ToWgs84TransformationParams.rx,
//     ry: -pulkovo1942ToWgs84TransformationParams.ry,
//     rz: -pulkovo1942ToWgs84TransformationParams.rz,
//     ds: -pulkovo1942ToWgs84TransformationParams.ds,
// };

// EPSG 9602
function geographic3DToGeocentric({lat, lon, h}, {a, inv_f}) {
    const degToRad = Math.PI / 180;
    const ϕ = lat * degToRad;
    const λ = lon * degToRad;
    const sin_ϕ = Math.sin(ϕ);
    const cos_ϕ = Math.cos(ϕ);
    const cos_λ = Math.cos(λ);
    const sin_λ = Math.sin(λ);
    const f = 1 / inv_f;
    const e_2 = 2 * f - f * f;
    const ν = a / Math.sqrt(1 - e_2 * sin_ϕ * sin_ϕ);
    return {
        x: (ν + h) * cos_ϕ * cos_λ,
        y: (ν + h) * cos_ϕ * sin_λ,
        z: ((1 - e_2) * ν + h) * sin_ϕ,
    };
}

// EPSG 9602
function geocentricToGeographic3D({x, y, z}, {a, inv_f}) {
    const radToDeg = 180 / Math.PI;
    const f = 1 / inv_f;
    const b = a * (1 - f);
    const p = Math.sqrt(x * x + y * y);
    const q = Math.atan2(z * a, p * b);
    const sin_q_3 = Math.sin(q) ** 3;
    const cos_q_3 = Math.cos(q) ** 3;
    const e_2 = 2 * f - f * f;
    const ε = e_2 / (1 - e_2);
    const ϕ = Math.atan2(z + ε * b * sin_q_3, p - e_2 * a * cos_q_3);
    const λ = Math.atan2(y, x);
    const ν = a / Math.sqrt(1 - e_2 * Math.sin(ϕ) ** 2);
    const h = p / Math.cos(ϕ) - ν;
    return {
        lat: ϕ * radToDeg,
        lon: λ * radToDeg,
        h,
    };
}

/* eslint-enable camelcase */

// EPSG 1032
function rotateCoordinateFrameGeocentric({x, y, z}, params) {
    const arcSecToRad = Math.PI / 180 / 3600;
    const m = 1 + params.ds * 1e-6;
    const rx = params.rx * arcSecToRad;
    const ry = params.ry * arcSecToRad;
    const rz = params.rz * arcSecToRad;
    return {
        x: m * (x + y * rz - z * ry) + params.dx,
        y: m * (-x * rz + y + z * rx) + params.dy,
        z: m * (x * ry - y * rx + z) + params.dz,
    };
}

// EPSG 9659
function geographic2DTo3D({lat, lon}) {
    return {lat, lon, h: 0};
}

// EPSG 9659
// eslint-disable-next-line no-unused-vars
function geographic3DTo2D({lat, lon, h}) {
    return {lat, lon};
}

// EPSG 9607
function rotateCoordinateFrameGeog2D({lat, lon}, transformationParams, srcEllipsoid, targetEllipsoid) {
    const srcGeod3D = geographic2DTo3D({lat, lon});
    const srcGeocentric = geographic3DToGeocentric(srcGeod3D, srcEllipsoid);
    const destGeocentric = rotateCoordinateFrameGeocentric(srcGeocentric, transformationParams);
    const destGeog3D = geocentricToGeographic3D(destGeocentric, targetEllipsoid);
    return geographic3DTo2D(destGeog3D);
}

function pulkovo1942ToWgs84({lat, lon}) {
    return rotateCoordinateFrameGeog2D(
        {
            lat,
            lon,
        },
        pulkovo1942ToWgs84TransformationParams,
        ellipsoidKrassowsky1940,
        ellipsoidWGS1984
    );
}

// function wgs84ToPulkovo1942({lat, lon}) {
//     return rotateCoordinateFrameGeog2D(
//         {
//             lat,
//             lon,
//         },
//         wgs84ToPulkovo1942TransformationParams,
//         ellipsoidWGS1984,
//         ellipsoidKrassowsky1940
//     );
// }

export {pulkovo1942ToWgs84};
