
import { describe, expect, it } from "vitest";
import { getTag, rsMatch, type Tags } from "./rsMatch";

describe("rsMatch", () => {

    type Template = { 'Left': number } |
    {
        'Right': {
            key: string,
            value: string
        }
    } |
    { 'Central': null };

    it("should match all enum values at compile time", () => {

        {
            // Arrange
            const template: Template = {
                Central: null,
            };
    
            // Act
            const result = rsMatch<Template, string>(template, {
                Left: (val) => "Left-" + val,
                Central: () => "Central",
                Right: (val) => "Right-" + val.key + "-" + val.value,
            });
    
            // Assert
            expect(result).toEqual("Central");
        }

        {
            // Arrange
            const template: Template = {
                Right: {
                    key: "key",
                    value: "value"
                }
            };
    
            // Act
            const result = rsMatch<Template, string>(template, {
                Left: (val) => "Left-" + val,
                Central: () => "Central",
                Right: (val) => "Right-" + val.key + "-" + val.value,
            });
    
            // Assert
            expect(result).toEqual("Right-key-value");
        }

        {
            // Arrange
            const template: Template = {
                Left: 123,
            };
    
            // Act
            const result = rsMatch<Template, string>(template, {
                Left: (val) => "Left-" + val,
                Central: () => "Central",
                Right: (val) => "Right-" + val.key + "-" + val.value,
            });
    
            // Assert
            expect(result).toEqual("Left-123");
        }
    });

    it("should return the tags", () => {

        {
            // Arrange
            const template: Template = {
                Left: 123,
            };
    
            // Act
            const tag = getTag<Template>(template);
    
            // Assert
            expect(tag).toEqual("Left");
        }

        {
            // Arrange
            const template: Template = {
                Right: {
                    key: "key",
                    value: "value"
                }
            };
    
            // Act
            const tag = getTag<Template>(template);
    
            // Assert
            expect(tag).toEqual("Right");
        }

        {
            // Arrange
            const template: Template = {
                Central: null,
            };
    
            // Act
            const tag = getTag<Template>(template);
    
            // Assert
            expect(tag).toEqual("Central");
        }
    });

});
