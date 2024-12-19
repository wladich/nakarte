import argparse
import base64
import os
import re
from functools import cache

import requests
import toml
from selenium import webdriver


def parse_icons_definitions(filename: str):
    with open(filename) as f:
        return toml.load(f)


@cache
def get_url_contents(url: str) -> (str, str | bytes):
    response = requests.get(url)
    response.raise_for_status()
    content_type = response.headers["content-type"]
    try:
        return content_type, response.content.decode("utf-8")
    except UnicodeDecodeError:
        return content_type, response.content


def encode_to_data_url(content_type: str, data: str | bytes) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return f"data:{content_type};base64," + base64.standard_b64encode(data).decode(
        "ascii"
    )


def inline_urls(s: str) -> str:
    for m in reversed(
        list(re.finditer(r"""\burl *\( *['"]?(http[^)]+?)['"]? *\)""", s))
    ):
        content_type, url_contents = get_url_contents(m.group(1))
        if isinstance(url_contents, str):
            url_contents = inline_urls(url_contents)
        inlined = encode_to_data_url(content_type, url_contents)
        s = s[: m.start(1)] + inlined + s[m.end(1) :]
    return s


def render_svg(template_file, template_vars):
    vars_defaults = {
        "text_dx": 0,
        "text_dy": 0,
    }
    with open(template_file, encoding="utf-8") as src:
        template = src.read()
    svg = template.format(**{**vars_defaults, **template_vars})
    return inline_urls(svg)


def create_svg_file(template_file, template_vars, output_file):
    svg = render_svg(template_file, template_vars)
    with open(output_file, mode="w", encoding="utf-8") as dest:
        dest.write(svg)


def create_png_file(template_file, template_vars, output_file):
    svg = render_svg(template_file, template_vars)
    png = rasterize_svg(svg)
    with open(output_file, "wb") as f:
        f.write(png)


def get_selenium_driver():
    options = webdriver.ChromeOptions()
    # options.binary_location = "/usr/bin/google-chrome"
    options.add_argument("--headless")
    # options.add_argument("--force-device-scale-factor=1")
    return webdriver.Chrome(options=options)


def rasterize_svg(svg_data: str) -> bytes:
    svg_data_uri = encode_to_data_url("image/svg+xml", svg_data)
    with get_selenium_driver() as driver:
        driver.get("about:blank")
        image = driver.execute_script(
            """
            const image = document.createElement("img"); 
            image.src = arguments[0];
            document.body.appendChild(image); 
            return image;
            """,
            svg_data_uri,
        )
        # breakpoint()
        assert image.size["width"] and image.size["height"]
        png_data_url: str = driver.execute_script(
            """
            const image = arguments[0];
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            canvas
                .getContext('2d')
                .drawImage(image, 0, 0, image.width, image.height);
            return canvas.toDataURL("image/png"); 
            """,
            image,
        )
    png_data = base64.decodebytes(
        png_data_url.removeprefix("data:image/png;base64,").encode()
    )
    assert png_data
    return png_data


def create_svg_files(icon_defs, base_dir, output_dir):
    for icon_name, icon_def in icon_defs.items():
        create_svg_file(
            template_file=os.path.join(base_dir, icon_def["src"]),
            template_vars=icon_def.get("var", {}),
            output_file=os.path.join(output_dir, icon_name) + ".svg",
        )


def create_png_files(icon_defs, base_dir, output_dir):
    for icon_name, icon_def in icon_defs.items():
        create_png_file(
            template_file=os.path.join(base_dir, icon_def["src"]),
            template_vars=icon_def.get("var", {}),
            output_file=os.path.join(output_dir, icon_name) + ".png",
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("defs", help="Icons definitions file")
    parser.add_argument("out", help="Output directory")
    conf = parser.parse_args()
    icon_defs = parse_icons_definitions(conf.defs)
    base_dir = os.path.dirname(conf.defs)
    create_svg_files(icon_defs, base_dir, conf.out)
    create_png_files(icon_defs, base_dir, conf.out)


if __name__ == "__main__":
    main()
