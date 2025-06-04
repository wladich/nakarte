#!/usr/bin/env python3
import argparse
import json

from shapely.geometry import MultiPolygon, Point, Polygon, shape

OUTPUT_PRECISION = 5


def simplify_line(line, tolerance):
    return line.simplify(tolerance, preserve_topology=True)


def round_coordinates(line, precision):
    return [(round(x, precision), round(y, precision)) for x, y in line.coords]


def main(input_file, output_file, tolerance):
    with open(input_file, "r") as f:
        data = json.load(f)

    total_nodes = 0
    simplified_geometries = []
    for feature in data["features"]:
        geom = shape(feature["geometry"])
        if isinstance(geom, Point):
            print("Skipping point geometry")
            continue
        if isinstance(geom, Polygon):
            polygons = [geom]
        elif isinstance(geom, MultiPolygon):
            polygons = geom.geoms
        else:
            print(f"Error: Unsupported geometry type '{geom.geom_type}' encountered.")
            exit(1)

        for polygon in polygons:
            if polygon.interiors:
                print("Error: Polygons with holes not supported")
                exit(1)
            linestring = polygon.exterior
            simplified_linestring = simplify_line(linestring, tolerance)
            simplified_geometries.append(
                round_coordinates(simplified_linestring, OUTPUT_PRECISION)
            )

            polygon_index = len(simplified_geometries)
            orig_nodes_count = len(linestring.coords)
            result_nodes_count = len(simplified_linestring.coords)

            print(
                f"Polygon #{polygon_index}: {orig_nodes_count} -> {result_nodes_count} nodes."
            )
            total_nodes += len(simplified_linestring.coords)

    with open(output_file, "w") as f:
        data = {"cutline": simplified_geometries}
        json.dump(data, f)
    print(f"Total nodes: {total_nodes}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create boundary from a GeoJSON.")
    parser.add_argument("input_file", type=str, help="Input GeoJSON file")
    parser.add_argument("output_file", type=str, help="Output JSON file")
    parser.add_argument(
        "-t",
        "--tolerance",
        default=0.01,
        type=float,
        help="Tolerance for simplifying geometries, default=0.01",
    )
    args = parser.parse_args()
    main(args.input_file, args.output_file, args.tolerance)

