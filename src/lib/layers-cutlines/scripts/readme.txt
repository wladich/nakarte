How to prepare json cutline for country.

1. On https://www.openstreetmap.org/ find relation id for country border
2. On https://overpass-turbo.eu/ execute query, replacing ID with actual value:
rel(ID);
out body;
>;
out skel qt;
3. Export result as geojson.
4. Check result at https://geojson.io/
5. Use script cutline.py to create cutline file.
