package com.lovesathi.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class LovesathiBuildConfigTest {

    @Test
    public void exposesTheLovesathiApplicationId() {
        assertEquals("com.lovesathi.app", BuildConfig.APPLICATION_ID);
    }
}
