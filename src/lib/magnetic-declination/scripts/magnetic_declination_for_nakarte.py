#!/usr/bin/env python3
# coding: utf-8
import argparse
import base64
import csv
import datetime
import json
import math
import re
from urllib.parse import urlencode
from urllib.request import urlopen

MIN_LAT = -58
MAX_LAT = 78
GRID_STEP = 2
OUTPUT_VALUE_SCALE = 2


def fetch_magnetic_declination_grid(date: datetime.date) -> bytes:
    # API documentation: https://www.ngdc.noaa.gov/geomag/CalcSurveyFin.shtml
    timeout = 30
    url = "https://www.ngdc.noaa.gov/geomag-web/calculators/calculateIgrfgrid"
    request_params = {
        "key": "gFE5W",
        "lat1": MIN_LAT,
        "lat2": MAX_LAT,
        "latStepSize": GRID_STEP,
        "lon1": "-180",
        "lon2": "180",
        "lonStepSize": GRID_STEP,
        "magneticComponent": "d",
        "model": "WMM",
        "startYear": date.year,
        "startMonth": date.month,
        "startDay": date.day,
        "endYear": date.year,
        "endMonth": date.month,
        "endDay": date.day,
        "resultFormat": "csv",
    }
    resp = urlopen(url + "?" + urlencode(request_params), timeout=timeout)
    assert resp.code == 200
    return resp.read()


def parse_declination_csv(data: bytes) -> dict[tuple[float, float], float]:
    declinations = {}
    csv_lines = [
        line for line in data.decode().splitlines() if not line.startswith("#")
    ]
    for row in csv.reader(csv_lines):
        assert len(row) == 7
        lat = float(row[1])
        lon = float(row[2])
        declination = float(row[4])
        declinations[(lat, lon)] = declination
    return declinations


def get_model_name(data: bytes) -> str:
    m = re.search(r"Magnetic Model:\s*([^(+]+)", data.decode())
    return m.group(1).strip()


def write_output(
    filename: str,
    declinations: dict[tuple[float, float] : float],
    model_name: str,
    model_date: datetime.date,
) -> None:
    value_offset = -math.floor(min(declinations.values()))
    packed_values = bytes(
        int(round(declinations[(lat, lon)] + value_offset) * OUTPUT_VALUE_SCALE)
        for lat in range(MIN_LAT, MAX_LAT + 1, GRID_STEP)
        for lon in range(-180, 180, GRID_STEP)
    )

    data = {
        "array": base64.standard_b64encode(packed_values).decode(),
        "minLat": MIN_LAT,
        "maxLat": MAX_LAT,
        "step": GRID_STEP,
        "rowsCount": (MAX_LAT - MIN_LAT) // GRID_STEP + 1,
        "colsCount": 360 // GRID_STEP,
        "valueScale": OUTPUT_VALUE_SCALE,
        "valueOffset": value_offset,
        "model": model_name,
        "dateYMD": [model_date.year, model_date.month, model_date.day],
    }
    with open(filename, "w") as f:
        json.dump(data, f, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", help="Output filename")
    parser.add_argument(
        "--date",
        help="Date for calculating magnetic declination. Format is YYYY-MM-DD. Default current date",
    )
    conf = parser.parse_args()
    if conf.date is not None:
        date = datetime.datetime.strptime(conf.date, "%Y-%m-%d")
    else:
        date = datetime.date.today()

    csv_data = fetch_magnetic_declination_grid(date)

    # store/load file for debugging
    # with open('data.csv', 'wb') as f:
    #     f.write(csv_data)
    # with open("data.csv", "rb") as f:
    #     csv_data = f.read()

    declinations = parse_declination_csv(csv_data)
    model_name = get_model_name(csv_data)
    write_output(conf.output, declinations, model_name, date)


if __name__ == "__main__":
    main()
