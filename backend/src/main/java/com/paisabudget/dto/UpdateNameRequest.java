package com.paisabudget.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpdateNameRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    public UpdateNameRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
